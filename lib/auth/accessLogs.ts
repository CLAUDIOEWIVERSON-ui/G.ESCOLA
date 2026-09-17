import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface AccessLogItem {
  id: string;
  userId: string;
  userName: string;
  email: string | null;
  role: string;
  createdAt: string;
  timestamp: number;
  device: string;
  browser: string;
  os: string;
  path: string;
  accessType: string;
  ipAddress?: string | null;
  isOnline?: boolean;
}

declare global {
  var _recentAccessLogs: AccessLogItem[] | undefined;
}

function getMemoryLogs(): AccessLogItem[] {
  if (!global._recentAccessLogs) {
    global._recentAccessLogs = [];
  }
  return global._recentAccessLogs;
}

/**
 * Registra um novo acesso no histórico em memória e no banco de dados Supabase
 */
export async function recordAccessLog(params: {
  userId: string;
  userName: string;
  email?: string | null;
  role?: string;
  path?: string;
  device?: string;
  browser?: string;
  os?: string;
  accessType?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AccessLogItem> {
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  const accessItem: AccessLogItem = {
    id: `log_${nowMs}_${Math.random().toString(36).substring(2, 7)}`,
    userId: params.userId,
    userName: params.userName || 'Usuário',
    email: params.email || null,
    role: params.role || 'aluno',
    createdAt: nowIso,
    timestamp: nowMs,
    device: params.device || 'Desktop',
    browser: params.browser || 'Navegador',
    os: params.os || 'Sistema',
    path: params.path || '/',
    accessType: params.accessType || 'Acesso ao Sistema',
    ipAddress: params.ipAddress || null,
    isOnline: true
  };

  // 1. Inserir no buffer em memória no topo da lista (evita duplicados em menos de 10 segundos para a mesma sessão)
  const memoryLogs = getMemoryLogs();
  const recentDuplicateIndex = memoryLogs.findIndex(
    l => l.userId === accessItem.userId && Math.abs(l.timestamp - nowMs) < 10000
  );

  if (recentDuplicateIndex >= 0) {
    // Atualizar registro existente recente
    memoryLogs[recentDuplicateIndex] = {
      ...memoryLogs[recentDuplicateIndex],
      ...accessItem,
      id: memoryLogs[recentDuplicateIndex].id
    };
  } else {
    // Adicionar no início
    memoryLogs.unshift(accessItem);
    // Limitar histórico em memória a 50 registros
    if (memoryLogs.length > 50) {
      memoryLogs.length = 50;
    }
  }

  // 2. Persistir no banco de dados Supabase (tabela access_logs)
  try {
    const actionPayload = JSON.stringify({
      userName: accessItem.userName,
      role: accessItem.role,
      device: accessItem.device,
      browser: accessItem.browser,
      os: accessItem.os,
      accessType: accessItem.accessType
    });

    const client = isSupabaseAdminConfigured() ? supabaseAdmin : await createClient();

    const { data, error } = await client
      .from('access_logs')
      .insert({
        user_id: accessItem.userId || null,
        email: accessItem.email || null,
        path: accessItem.path,
        action: actionPayload,
        status_code: 200,
        ip_address: accessItem.ipAddress || null,
        user_agent: params.userAgent || `${accessItem.browser} (${accessItem.os})`,
        created_at: nowIso
      })
      .select('id')
      .maybeSingle();

    if (!error && data?.id) {
      accessItem.id = data.id;
    }
  } catch (dbErr) {
    console.warn('[accessLogs] Error persisting access log to database (in-memory kept):', dbErr);
  }

  return accessItem;
}

/**
 * Recupera os últimos acessos registrados (padrão: 10 acessos)
 * Prioriza dados completos com nome do usuário e status online em tempo real
 */
export async function getRecentAccessLogs(limit = 10): Promise<AccessLogItem[]> {
  const memoryLogs = getMemoryLogs();
  const dbLogs: AccessLogItem[] = [];

  try {
    const client = isSupabaseAdminConfigured() ? supabaseAdmin : await createClient();

    // Consulta os últimos registros da tabela access_logs com dados do perfil
    const { data, error } = await client
      .from('access_logs')
      .select('id, user_id, email, path, action, status_code, ip_address, user_agent, created_at, profiles(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (!error && data && data.length > 0) {
      for (const row of data) {
        let parsedAction: any = {};
        if (row.action) {
          try {
            parsedAction = typeof row.action === 'string' && row.action.startsWith('{')
              ? JSON.parse(row.action)
              : { accessType: row.action };
          } catch {
            parsedAction = { accessType: row.action };
          }
        }

        const profile = (row as any).profiles;
        const userName = 
          parsedAction.userName || 
          profile?.full_name || 
          (row.email ? row.email.split('@')[0] : 'Usuário');

        const role = parsedAction.role || profile?.role || 'aluno';
        const createdAt = row.created_at || new Date().toISOString();
        const timestamp = new Date(createdAt).getTime();

        dbLogs.push({
          id: row.id,
          userId: row.user_id || '',
          userName,
          email: row.email || null,
          role,
          createdAt,
          timestamp,
          device: parsedAction.device || 'Desktop',
          browser: parsedAction.browser || 'Navegador',
          os: parsedAction.os || 'Sistema',
          path: row.path || '/',
          accessType: parsedAction.accessType || 'Acesso ao Sistema',
          ipAddress: row.ip_address || null
        });
      }
    }
  } catch (err) {
    console.warn('[accessLogs] Error reading from access_logs table:', err);
  }

  // 3. Mesclar dados do banco com dados em memória, eliminando duplicados
  const mergedMap = new Map<string, AccessLogItem>();

  // Adicionar primeiro os da memória (mais recentes)
  for (const item of memoryLogs) {
    const key = `${item.userId}_${Math.floor(item.timestamp / 10000)}`;
    mergedMap.set(key, item);
  }

  // Adicionar do banco se não existir similar recente
  for (const item of dbLogs) {
    const key = `${item.userId}_${Math.floor(item.timestamp / 10000)}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, item);
    }
  }

  const combined = Array.from(mergedMap.values());
  // Ordenar por data/hora decrescente
  combined.sort((a, b) => b.timestamp - a.timestamp);

  // Verificar status online em tempo real
  const activeSessions = global._activeSessionsMap || {};
  const onlineUserIds = new Set<string>();
  const onlineEmails = new Set<string>();

  for (const sid in activeSessions) {
    const s = activeSessions[sid];
    if (s.userId) onlineUserIds.add(s.userId);
    if (s.email) onlineEmails.add(s.email.toLowerCase());
  }

  const enriched = combined.map(log => ({
    ...log,
    isOnline: Boolean(
      (log.userId && onlineUserIds.has(log.userId)) ||
      (log.email && onlineEmails.has(log.email.toLowerCase()))
    )
  }));

  return enriched.slice(0, limit);
}
