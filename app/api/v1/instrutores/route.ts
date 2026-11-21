import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserRole } from '@/lib/auth/serverAuth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUserRole(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const db = isSupabaseAdminConfigured() ? supabaseAdmin : await createClient();

    const [{ data: profilesData, error: profilesError }, { data: turmasData, error: turmasError }] =
      await Promise.all([
        db
          .from('profiles')
          .select('id, full_name, role, grupo_responsavel')
          .in('role', ['instrutor', 'admin']),
        db
          .from('turmas')
          .select('id, instrutor')
          .is('deleted_at', null),
      ]);

    if (profilesError) {
      console.warn('[GET /api/v1/instrutores] Erro ao ler profiles:', profilesError.message);
    }
    if (turmasError) {
      console.warn('[GET /api/v1/instrutores] Erro ao ler turmas:', turmasError.message);
    }

    const profilesMap: Record<string, string> = {};
    const instrutores: Array<{
      id: string;
      full_name: string;
      role?: string;
      grupo_responsavel?: string | null;
    }> = [];

    (profilesData || []).forEach((p: any) => {
      const id = String(p?.id || '').trim();
      const name = String(p?.full_name || '').trim();
      if (!id || !name) return;
      profilesMap[id] = name;
      instrutores.push({
        id,
        full_name: name,
        role: p.role,
        grupo_responsavel: p.grupo_responsavel || null,
      });
    });

    const turmaInstructors: Record<string, string> = {};
    (turmasData || []).forEach((t: any) => {
      const id = String(t?.id || '').trim();
      const name = String(t?.instrutor || '').trim();
      if (id && name) {
        turmaInstructors[id] = name;
      }
    });

    return NextResponse.json({
      success: true,
      instrutores,
      profilesMap,
      turmaInstructors,
    });
  } catch (err: any) {
    console.error('[GET /api/v1/instrutores] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao carregar instrutores.' },
      { status: 500 }
    );
  }
}
