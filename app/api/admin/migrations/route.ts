import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

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

    if (useAdmin) {
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
