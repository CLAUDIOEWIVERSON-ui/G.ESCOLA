import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Validar autenticação do usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Validar se usuário é administrador
    const isConfigured = isSupabaseAdminConfigured();
    let isAdmin = false;

    const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
    if (user.email === SUPER_ADMIN_EMAIL) {
      isAdmin = true;
    } else if (isConfigured) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso restrito apenas ao TI e Administradores.' }, { status: 403 });
    }

    const capacityBytes = 500 * 1024 * 1024; // 500MB (Supabase Free Tier storage cap)

    // 1. Tentar obter os dados reais pelo RPC Postgres
    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin
        .rpc('get_db_storage_stats');

      if (!rpcError && rpcData && Array.isNative ? false : Array.isArray(rpcData) && rpcData.length > 0) {
        // Formatar resultados reais do postgres
        const tablesList = rpcData.map((row: any) => ({
          name: row.table_name.replace('public.', ''),
          rowCount: parseInt(row.row_count || '0'),
          sizeBytes: parseInt(row.table_size_bytes || '0'),
        }));

        const totalSizeBytes = parseInt(rpcData[0]?.total_db_size_bytes || '0');
        const calculatedPercentage = (totalSizeBytes / capacityBytes) * 100;

        return NextResponse.json({
          source: 'postgres_rpc',
          capacityBytes,
          totalSizeBytes,
          percentage: parseFloat(calculatedPercentage.toFixed(3)),
          tables: tablesList
        });
      }
    } catch (rpcErr) {
      console.warn('[db-size-api] Erro ao invocar RPC de sintonização física, usando solucionador de contagem analítica:', rpcErr);
    }

    // 2. Fallback: Estimador real de tamanho analítico com base em contagem de linhas e peso estrutural
    // Lista de tabelas chave do sistema Escola Digital
    const systemTables = [
      { name: 'alunos', label: 'Alunos / Cadastros', weightPerRow: 2200 },
      { name: 'notas', label: 'Notas e Módulos', weightPerRow: 800 },
      { name: 'frequencia', label: 'Frequência do Aluno', weightPerRow: 500 },
      { name: 'sugestoes', label: 'Sugestões de Melhoria', weightPerRow: 3000 },
      { name: 'profiles', label: 'Perfis de Usuários', weightPerRow: 1200 },
      { name: 'certificados', label: 'Certificados Gerados', weightPerRow: 4500 },
      { name: 'questionarios_conclusao', label: 'Pesquisas de Satisfação', weightPerRow: 3500 },
      { name: 'cursos', label: 'Cursos Cadastrados', weightPerRow: 1500 },
      { name: 'turmas', label: 'Turmas Criadas', weightPerRow: 1500 },
      { name: 'disciplinas', label: 'Matérias e Disciplinas', weightPerRow: 1000 },
      { name: 'eventos', label: 'Eventos / Calendário', weightPerRow: 1800 },
      { name: 'useful_links', label: 'Atalhos Rápidos', weightPerRow: 1000 }
    ];

    // Consulta assíncrona paralela do tamanho de cada tabela para obter a contagem exata de linhas reais
    const tablePromises = systemTables.map(async (table) => {
      try {
        const { count, error } = await supabaseAdmin
          .from(table.name)
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        
        const rowCount = count || 0;
        const sizeBytes = rowCount * table.weightPerRow;

        return {
          name: table.name,
          label: table.label,
          rowCount,
          sizeBytes
        };
      } catch (err) {
        // Se a tabela ainda não existir (não migrada), retorna 0 linhas
        return {
          name: table.name,
          label: table.label,
          rowCount: 0,
          sizeBytes: 0
        };
      }
    });

    const results = await Promise.all(tablePromises);

    // Baseline fixo do esquema postgresql livre de dados (infraestrutura inicial, índices vazios, auth tables, extensões etc)
    const basePostgresOverhead = 48234496; // ~46MB tamanho base de um BD Supabase vazio

    // Soma do peso das tabelas + Overhead do banco
    const calculatedTablesWeightBytes = results.reduce((sum, item) => sum + item.sizeBytes, 0);
    const totalSizeBytes = basePostgresOverhead + calculatedTablesWeightBytes;
    const percentage = (totalSizeBytes / capacityBytes) * 100;

    return NextResponse.json({
      source: 'analytical_fallback',
      capacityBytes,
      totalSizeBytes,
      percentage: parseFloat(percentage.toFixed(4)),
      tables: results.map(r => ({
        name: r.name,
        label: r.label,
        rowCount: r.rowCount,
        sizeBytes: r.sizeBytes
      }))
    });

  } catch (err: any) {
    console.error('[db-size-api] Critical error:', err);
    return NextResponse.json({ error: err.message || 'Erro inesperado na análise de capacidade' }, { status: 500 });
  }
}
