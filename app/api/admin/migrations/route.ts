import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Check if user is Admin
    const useAdmin = isSupabaseAdminConfigured();
    let isAdmin = false;

    const SUPER_ADMIN_EMAIL = 'claudiomarinha2012@gmail.com';
    if (user.email === SUPER_ADMIN_EMAIL) {
      isAdmin = true;
    } else if (useAdmin) {
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem gerenciar o esquema do banco de dados.' }, { status: 403 });
    }

    // Define items to check in the database schema
    const checkItems = [
      {
        key: 'student_access_codes',
        tableName: 'student_access_codes',
        fileName: '28_student_access_codes.sql',
        description: 'Tabela de códigos de acesso e controle de autenticação de Alunos, permitindo login com código NIF e senha padrão.',
        isColumn: false,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('student_access_codes')
            .select('id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'questionarios_conclusao',
        tableName: 'questionarios_conclusao',
        fileName: '25_create_questionario_conclusao.sql',
        description: 'Tabela de questionários e pesquisa de satisfação de conclusão de curso, avaliando infraestrutura, material e instrutores.',
        isColumn: false,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('questionarios_conclusao')
            .select('id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'eventos_exibir_aluno',
        tableName: 'eventos',
        columnName: 'exibir_aluno',
        fileName: '29_add_exibir_aluno_to_eventos.sql',
        description: 'Coluna na tabela de eventos para controlar a visibilidade de avisos e notificações específicas na área do aluno.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('eventos')
            .select('exibir_aluno')
            .limit(1);
          return error;
        }
      },
      {
        key: 'useful_links',
        tableName: 'useful_links',
        fileName: '22_create_useful_links_table.sql',
        description: 'Tabela de links úteis e atalhos rápidos compartilhados pelo coordenador e visíveis para alunos na barra de navegação.',
        isColumn: false,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('useful_links')
            .select('id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'grupo_responsavel_cursos',
        tableName: 'cursos',
        columnName: 'grupo_responsavel',
        fileName: '30_add_grupo_responsavel_to_cursos_turmas.sql',
        description: 'Coluna grupo_responsavel na tabela de cursos para segmentar os cursos entre os grupos MAN e GAT.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('cursos')
            .select('grupo_responsavel')
            .limit(1);
          return error;
        }
      },
      {
        key: 'documento_criacao_cursos',
        tableName: 'cursos',
        columnName: 'documento_criacao',
        fileName: '34_add_documento_criacao_to_cursos.sql',
        description: 'Coluna documento_criacao na tabela de cursos para armazenar o tipo de documento de criação do curso (Ordem Interna, CENPEM, ROV ou PGI).',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('cursos')
            .select('documento_criacao')
            .limit(1);
          return error;
        }
      },
      {
        key: 'grupo_responsavel_turmas',
        tableName: 'turmas',
        columnName: 'grupo_responsavel',
        fileName: '30_add_grupo_responsavel_to_cursos_turmas.sql',
        description: 'Coluna grupo_responsavel na tabela de turmas para segmentar as turmas entre os grupos MAN e GAT.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('turmas')
            .select('grupo_responsavel')
            .limit(1);
          return error;
        }
      },
      {
        key: 'grupo_responsavel_profiles',
        tableName: 'profiles',
        columnName: 'grupo_responsavel',
        fileName: '30_add_grupo_responsavel_to_cursos_turmas.sql',
        description: 'Coluna grupo_responsavel na tabela de perfis de usuário, definindo a qual grupo (MAN ou GAT) o instrutor pertence.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('profiles')
            .select('grupo_responsavel')
            .limit(1);
          return error;
        }
      },
      {
        key: 'grupo_responsavel_profiles_ambos',
        tableName: 'profiles',
        columnName: 'grupo_responsavel',
        fileName: '32_add_ambos_to_grupo_responsavel.sql',
        description: 'Atualiza a restrição do campo grupo_responsavel na tabela de perfis de usuário para permitir o valor AMBOS para instrutores vinculados a ambos os departamentos.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('profiles')
            .select('grupo_responsavel')
            .limit(1);
          return error;
        }
      },
      {
        key: 'grupo_responsavel_remove_checks',
        tableName: 'cursos',
        columnName: 'grupo_responsavel',
        fileName: '33_remove_grupo_responsavel_check_constraints.sql',
        description: 'Remove restrições rígidas (CHECK constraints) da coluna grupo_responsavel para permitir a inserção e edição de qualquer nome de grupo personalizado nas tabelas de cursos, turmas e perfis.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('cursos')
            .select('grupo_responsavel')
            .limit(1);
          return error;
        }
      },
      {
        key: 'pensamento_dia',
        tableName: 'pensamento_dia',
        fileName: '31_create_pensamento_dia.sql',
        description: 'Tabela de armazenamento do Pensamento do Dia, permitindo sincronização para a visualização de todos com gerador integrado via IA.',
        isColumn: false,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('pensamento_dia')
            .select('id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'certificates_system',
        tableName: 'certificate_templates',
        fileName: '34_create_certificates_system.sql',
        description: 'Módulo acadêmico profissional para criação, edição de layouts, assinaturas e emissão de certificados/diplomas em lote com malas diretas e verificação QR Code.',
        isColumn: false,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('certificate_templates')
            .select('id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'tipo_aluno_alunos',
        tableName: 'alunos',
        columnName: 'tipo_aluno',
        fileName: '35_add_tipo_aluno_to_alunos.sql',
        description: 'Coluna tipo_aluno na tabela de alunos para diferenciar estudantes se são Militares ou Civis, definindo seus avatares personalizados.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('alunos')
            .select('tipo_aluno')
            .limit(1);
          return error;
        }
      },
      {
        key: 'uniforme_dia_eventos',
        tableName: 'eventos',
        columnName: 'uniforme_dia',
        fileName: '36_add_uniforme_dia_to_eventos.sql',
        description: 'Coluna uniforme_dia na tabela de eventos para exibir as orientações de fardamento do dia no painel do aluno e na barra de avisos.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('eventos')
            .select('uniforme_dia')
            .limit(1);
          return error;
        }
      },
      {
        key: 'modulo_index_disciplinas',
        tableName: 'disciplinas',
        columnName: 'modulo_index',
        fileName: '37_reorganize_modules_and_disciplines.sql',
        description: 'Coluna modulo_index na tabela de disciplinas para gerenciar a hierarquia educacional corrigida (Curso -> Módulo -> Disciplina -> Tópico).',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('disciplinas')
            .select('modulo_index')
            .limit(1);
          return error;
        }
      },
      {
        key: 'nota20_modules',
        tableName: 'notas',
        columnName: 'nota20',
        fileName: '38_add_more_nota_modules_up_to_20.sql',
        description: 'Adiciona notas do módulo 11 ao 20 para dar suporte ao novo limite máximo de módulos dos cursos configurados no sistema.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('notas')
            .select('nota20')
            .limit(1);
          return error;
        }
      },
      {
        key: 'eventos_creator_id',
        tableName: 'eventos',
        columnName: 'creator_id',
        fileName: '39_add_creator_id_and_exclusivity_to_eventos.sql',
        description: 'Coluna creator_id na tabela de eventos para rastrear qual usuário criou a rotina ou evento administrativo.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('eventos')
            .select('creator_id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'eventos_is_exclusive',
        tableName: 'eventos',
        columnName: 'is_exclusive',
        fileName: '39_add_creator_id_and_exclusivity_to_eventos.sql',
        description: 'Coluna is_exclusive na tabela de eventos para segmentar rotinas exclusivas (personalizadas por usuário) das rotinas de caráter geral.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('eventos')
            .select('is_exclusive')
            .limit(1);
          return error;
        }
      },
      {
        key: 'eventos_exibir_instrutor',
        tableName: 'eventos',
        columnName: 'exibir_instrutor',
        fileName: '40_add_exibir_instrutor_to_eventos.sql',
        description: 'Coluna na tabela de eventos para controlar a visibilidade de avisos e notificações específicas na área do instrutor.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('eventos')
            .select('exibir_instrutor')
            .limit(1);
          return error;
        }
      },
      {
        key: 'eventos_target_grupo',
        tableName: 'eventos',
        columnName: 'target_grupo',
        fileName: '41_add_target_grupo_to_eventos.sql',
        description: 'Coluna target_grupo na tabela de eventos para segmentar rotinas e mensagens por grupo (GAT, MAN, ou AMBOS).',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('eventos')
            .select('target_grupo')
            .limit(1);
          return error;
        }
      },
      {
        key: 'sugestoes_table',
        tableName: 'sugestoes',
        fileName: '42_create_sugestoes_table.sql',
        description: 'Tabela de armazenamento das sugestões de melhorias enviadas para o TI de forma integrada ao painel.',
        isColumn: false,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('sugestoes')
            .select('id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'get_db_storage_stats_func',
        tableName: 'Função: get_db_storage_stats',
        fileName: '43_create_db_size_function.sql',
        description: 'Função PostgreSQL RPC utilizada para auditar em tempo real o peso total de cada tabela e o consumo geral do banco de dados.',
        isColumn: false,
        checkFn: async () => {
          // Check if function exists by attempting a dry call or querying pg_proc
          const { error } = await supabaseAdmin
            .rpc('get_db_storage_stats')
            .limit(1);
          
          if (error && error.message?.includes('does not exist')) {
            return error;
          }
          return null;
        }
      },
      {
        key: 'db_optimized_indices',
        tableName: 'Índices de Performance Supabase',
        fileName: '44_optimized_indices.sql',
        description: 'Conjunto de chaves de indexação rápidas criadas nas colunas mais consultadas do sistema (como deleted_at, frequencia(aluno_id, data) e turma_id) para otimizar os tempos de resposta.',
        isColumn: false,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('frequencia')
            .select('id')
            .limit(1);
          return error;
        }
      },
      {
        key: 'turmas_data_postergacao',
        tableName: 'turmas',
        columnName: 'data_postergacao',
        fileName: '45_add_data_postergacao_to_turmas.sql',
        description: 'Coluna data_postergacao na tabela de turmas para prorrogar/postergar o encerramento da turma, permitindo acesso de alunos e envio de avaliações após o fim regular do curso.',
        isColumn: true,
        checkFn: async () => {
          const { error } = await supabaseAdmin
            .from('turmas')
            .select('data_postergacao')
            .limit(1);
          return error;
        }
      }
    ];

    const results = [];

    for (const item of checkItems) {
      let status: 'valid' | 'missing' | 'error' = 'valid';
      let errorMessage = '';
      
      try {
        const error = await item.checkFn();
        
        if (error) {
          const msg = (error.message || '').toLowerCase();
          const code = error.code || '';
          
          // Postgres code '42P01' is relation does not exist
          // Postgres code '42703' is undefined column
          if (
            code === '42P01' || 
            code === 'PGRST204' ||
            msg.includes('relation') && (msg.includes('does not exist') || msg.includes('missing')) ||
            (item.isColumn && (code === '42703' || msg.includes('column') && msg.includes('does not exist')))
          ) {
            status = 'missing';
            errorMessage = error.message;
          } else {
            status = 'error';
            errorMessage = `${error.code ? `[${error.code}] ` : ''}${error.message}`;
          }
        }
      } catch (checkErr: any) {
        status = 'error';
        errorMessage = checkErr.message || 'Erro inesperado na verificação.';
      }

      // Read SQL migration script from /migrations folder
      let sqlContent = '';
      try {
        const migrationPath = path.join(process.cwd(), 'migrations', item.fileName);
        if (fs.existsSync(migrationPath)) {
          sqlContent = fs.readFileSync(migrationPath, 'utf8');
        } else {
          sqlContent = `-- Arquivo de migração ${item.fileName} não encontrado localmente no servidor.`;
        }
      } catch (fsErr: any) {
        sqlContent = `-- Erro ao ler arquivo de migração: ${fsErr?.message || fsErr}`;
      }

      results.push({
        key: item.key,
        tableName: item.tableName,
        columnName: (item as any).columnName || null,
        fileName: item.fileName,
        description: item.description,
        isColumn: item.isColumn,
        status,
        errorMessage,
        sql: sqlContent
      });
    }

    return NextResponse.json({
      success: true,
      integrityChecked: true,
      lastCheckAt: new Date().toISOString(),
      results
    });

  } catch (error: any) {
    console.error('[migrations_checker] Internal error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao checar integridade do banco de dados.' }, { status: 500 });
  }
}
