import crypto from 'crypto';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

const BUCKET_NAME = 'acompanhante-qr';
const INDEX_FILE_PATH = '_index.json';

export interface TurmaMonitorRecord {
  turma_id: string;
  user_id: string;
  full_name: string;
  email?: string;
  access_code: string;
  access_status: 'active' | 'revoked';
  last_login?: string | null;
  login_count?: number;
  created_at: string;
  updated_at: string;
}

export function generateMonitorAccessCode(): string {
  const hex = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `MON-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

function isMissingTableOrColumnError(err: any): boolean {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase();
  return (
    err?.code === '42P01' ||
    err?.code === 'PGRST205' ||
    err?.code === '42703' ||
    err?.code === 'PGRST100' ||
    msg.includes('acompanhante_access_codes') ||
    msg.includes('acompanhante_nome') ||
    msg.includes('acompanhante_user_id') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  );
}

async function ensureStorageBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: false });
    }
  } catch {
    // Ignore if bucket already exists or race condition
  }
}

async function readStorageMonitors(): Promise<TurmaMonitorRecord[]> {
  try {
    await ensureStorageBucket();
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(INDEX_FILE_PATH);
    if (error || !data) return [];
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStorageMonitors(records: TurmaMonitorRecord[]): Promise<void> {
  await ensureStorageBucket();
  const blob = new Blob([JSON.stringify(records)], { type: 'application/json' });
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(INDEX_FILE_PATH, blob, { upsert: true, contentType: 'application/json' });
  if (error) {
    throw new Error(error.message || 'Falha ao salvar registro de QR Code do monitor.');
  }
}

export async function upsertProfileSafe(profilePayload: Record<string, any>) {
  const payload = { ...profilePayload };
  let { error } = await supabaseAdmin
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (
    error &&
    (error.message?.includes('has_changed_password') ||
      error.code === 'PGRST100' ||
      error.message?.includes('turma_id'))
  ) {
    const cleaned = { ...payload };
    delete cleaned.has_changed_password;
    delete cleaned.turma_id;
    const retry = await supabaseAdmin.from('profiles').upsert(cleaned, { onConflict: 'id' });
    error = retry.error;
  }

  if (error && payload.role === 'acompanhante') {
    const fallbackPayload: Record<string, any> = { ...payload, role: 'convidado' };
    delete fallbackPayload.turma_id;
    delete fallbackPayload.has_changed_password;
    const retry = await supabaseAdmin.from('profiles').upsert(fallbackPayload, { onConflict: 'id' });
    error = retry.error;
  }

  return error;
}

export async function syncTurmaMonitorColumns(turmaId: string, fullName: string | null, userId: string | null) {
  try {
    const { error } = await supabaseAdmin
      .from('turmas')
      .update({
        acompanhante_nome: fullName,
        acompanhante_user_id: userId,
      })
      .eq('id', turmaId);

    if (error && !isMissingTableOrColumnError(error)) {
      console.warn('[acompanhanteQrStore] syncTurmaMonitorColumns warning:', error.message);
    }
  } catch {
    // Ignore when optional columns are not yet migrated
  }
}

export async function listAllMonitors(): Promise<TurmaMonitorRecord[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const byTurma = new Map<string, TurmaMonitorRecord>();

  // 1. Read DB table if available
  const { data: dbRows, error: dbErr } = await supabaseAdmin
    .from('acompanhante_access_codes')
    .select('*')
    .eq('access_status', 'active');

  if (!dbErr && Array.isArray(dbRows)) {
    dbRows.forEach((row: any) => {
      if (row.turma_id) {
        byTurma.set(row.turma_id, {
          turma_id: row.turma_id,
          user_id: row.user_id,
          full_name: row.full_name,
          access_code: row.access_code,
          access_status: row.access_status || 'active',
          last_login: row.last_login || null,
          login_count: row.login_count || 0,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
      }
    });
  }

  // 2. Merge Storage fallback records
  const storageRows = await readStorageMonitors();
  storageRows.forEach((row) => {
    if (row.turma_id && row.access_status !== 'revoked' && !byTurma.has(row.turma_id)) {
      byTurma.set(row.turma_id, row);
    }
  });

  // 3. Merge auth.users with role === 'acompanhante' (handles users created via /usuarios)
  try {
    let page = 1;
    while (page <= 10) {
      const { data: uList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (listErr || !uList?.users?.length) break;

      for (const u of uList.users) {
        const meta = u.user_metadata || {};
        if (meta.role === 'acompanhante' && meta.turma_id) {
          const existing = byTurma.get(meta.turma_id);
          if (existing) {
            if (!existing.email && u.email && !u.email.endsWith('@monitor.escola.digital')) {
              existing.email = u.email;
            }
          } else if (meta.acompanhante_access_code) {
            byTurma.set(meta.turma_id, {
              turma_id: meta.turma_id,
              user_id: u.id,
              full_name: meta.full_name || u.email?.split('@')[0] || 'Monitor de Turma',
              email: u.email && !u.email.endsWith('@monitor.escola.digital') ? u.email : undefined,
              access_code: meta.acompanhante_access_code,
              access_status: 'active',
              created_at: u.created_at || new Date().toISOString(),
              updated_at: u.updated_at || u.created_at || new Date().toISOString(),
            });
          } else {
            // User was created in /usuarios without an access code yet — provision one automatically
            const code = generateMonitorAccessCode();
            await supabaseAdmin.auth.admin.updateUserById(u.id, {
              user_metadata: {
                ...meta,
                acompanhante_access_code: code,
                is_turma_monitor: true,
              },
            });
            const rec: TurmaMonitorRecord = {
              turma_id: meta.turma_id,
              user_id: u.id,
              full_name: meta.full_name || u.email?.split('@')[0] || 'Monitor de Turma',
              email: u.email && !u.email.endsWith('@monitor.escola.digital') ? u.email : undefined,
              access_code: code,
              access_status: 'active',
              created_at: u.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await saveMonitorAccessRecord(rec);
            byTurma.set(meta.turma_id, rec);
          }
        }
      }

      if (uList.users.length < 1000) break;
      page++;
    }
  } catch (err) {
    console.warn('[acompanhanteQrStore] listUsers merge warning:', err);
  }

  return Array.from(byTurma.values());
}

export async function saveMonitorAccessRecord(record: TurmaMonitorRecord): Promise<void> {
  // Always persist to private Storage index for zero-DDL resilience
  const existing = await readStorageMonitors();
  const filtered = existing.filter((item) => item.turma_id !== record.turma_id);
  filtered.push(record);
  await writeStorageMonitors(filtered);

  // Also persist to DB table if migrated
  const { error } = await supabaseAdmin
    .from('acompanhante_access_codes')
    .upsert(
      {
        turma_id: record.turma_id,
        user_id: record.user_id,
        full_name: record.full_name,
        access_code: record.access_code,
        access_status: record.access_status,
        last_login: record.last_login || null,
        login_count: record.login_count || 0,
        updated_at: record.updated_at,
      },
      { onConflict: 'turma_id' }
    );

  if (error && !isMissingTableOrColumnError(error)) {
    console.warn('[acompanhanteQrStore] DB upsert warning:', error.message);
  }

  await syncTurmaMonitorColumns(
    record.turma_id,
    record.access_status === 'active' ? record.full_name : null,
    record.access_status === 'active' ? record.user_id : null
  );
}

export async function removeMonitorForTurma(turmaId: string): Promise<void> {
  const monitors = await listAllMonitors();
  const target = monitors.find((m) => m.turma_id === turmaId);

  if (target?.user_id) {
    try {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(target.user_id);
      const u = userRes?.user;
      if (u) {
        const meta = { ...(u.user_metadata || {}) };
        delete meta.acompanhante_access_code;
        delete meta.is_turma_monitor;
        if (u.email?.endsWith('@monitor.escola.digital')) {
          meta.turma_id = null;
        }
        await supabaseAdmin.auth.admin.updateUserById(u.id, { user_metadata: meta });
      }
    } catch (err) {
      console.warn('[acompanhanteQrStore] removeMonitor auth cleanup warning:', err);
    }
  }

  const existing = await readStorageMonitors();
  const updated = existing.filter((item) => item.turma_id !== turmaId);
  await writeStorageMonitors(updated);

  const { error } = await supabaseAdmin
    .from('acompanhante_access_codes')
    .delete()
    .eq('turma_id', turmaId);

  if (error && !isMissingTableOrColumnError(error)) {
    console.warn('[acompanhanteQrStore] DB delete warning:', error.message);
  }

  await syncTurmaMonitorColumns(turmaId, null, null);
}

export async function findAcompanhanteByAccessCode(cleanedCode: string): Promise<TurmaMonitorRecord | null> {
  if (!isSupabaseAdminConfigured() || !cleanedCode) return null;

  // 1. Check DB table directly
  const { data: dbRow, error: dbErr } = await supabaseAdmin
    .from('acompanhante_access_codes')
    .select('*')
    .ilike('access_code', cleanedCode)
    .eq('access_status', 'active')
    .maybeSingle();

  if (!dbErr && dbRow) {
    return {
      turma_id: dbRow.turma_id,
      user_id: dbRow.user_id,
      full_name: dbRow.full_name,
      access_code: dbRow.access_code,
      access_status: dbRow.access_status,
      last_login: dbRow.last_login,
      login_count: dbRow.login_count || 0,
      created_at: dbRow.created_at,
      updated_at: dbRow.updated_at,
    };
  }

  // 2. Fallback to Storage index + auth.users merge
  const all = await listAllMonitors();
  const match = all.find(
    (item) =>
      item.access_status === 'active' &&
      item.access_code.toUpperCase() === cleanedCode.toUpperCase()
  );
  return match || null;
}

export async function recordAcompanhanteQrLogin(turmaId: string): Promise<void> {
  const nowIso = new Date().toISOString();

  const existing = await readStorageMonitors();
  const idx = existing.findIndex((item) => item.turma_id === turmaId);
  if (idx >= 0) {
    existing[idx] = {
      ...existing[idx],
      last_login: nowIso,
      login_count: (existing[idx].login_count || 0) + 1,
      updated_at: nowIso,
    };
    await writeStorageMonitors(existing).catch(() => {});
  }

  const { data: dbRow } = await supabaseAdmin
    .from('acompanhante_access_codes')
    .select('id, login_count')
    .eq('turma_id', turmaId)
    .maybeSingle();

  if (dbRow?.id) {
    await supabaseAdmin
      .from('acompanhante_access_codes')
      .update({
        last_login: nowIso,
        login_count: (dbRow.login_count || 0) + 1,
        updated_at: nowIso,
      })
      .eq('id', dbRow.id);
  }
}
