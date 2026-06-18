-- Migração SQL 44 - Índices Otimizados para Supabase
-- Desenvolvida para reduzir a carga do banco de dados e acelerar consultas de agregação e listagem do Dashboard.

-- 1. Tabela de Alunos (Sondagens por Turma, Soft-deletes e filtros de status)
CREATE INDEX IF NOT EXISTS idx_alunos_turma_id ON public.alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_alunos_deleted_at ON public.alunos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_alunos_posto_graduacao ON public.alunos(posto_graduacao);

-- 2. Tabela de Turmas (Sondagens de Cursos, Visibilidade Internacional, Soft-deletes)
CREATE INDEX IF NOT EXISTS idx_turmas_curso_id ON public.turmas(curso_id);
CREATE INDEX IF NOT EXISTS idx_turmas_internacional ON public.turmas(internacional);
CREATE INDEX IF NOT EXISTS idx_turmas_deleted_at ON public.turmas(deleted_at);
CREATE INDEX IF NOT EXISTS idx_turmas_grupo_responsavel ON public.turmas(grupo_responsavel);

-- 3. Tabela de Cursos (Soft-deletes e filtros de nome)
CREATE INDEX IF NOT EXISTS idx_cursos_deleted_at ON public.cursos(deleted_at);

-- 4. Tabela de Notas e Módulos (Filtragens complexas de notas dos alunos)
CREATE INDEX IF NOT EXISTS idx_notas_aluno_id ON public.notas(aluno_id);

-- 5. Tabela de Frequência do Aluno (Filtro composto extremamente importante para as listagens de chamada diária e mapas mensais)
CREATE INDEX IF NOT EXISTS idx_frequencia_aluno_id ON public.frequencia(aluno_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_data ON public.frequencia(data);
CREATE INDEX IF NOT EXISTS idx_frequencia_aluno_data ON public.frequencia(aluno_id, data);

-- 6. Tabela de Eventos e Atividades (Filtragem por data, visibilidade de alunos e instrutores, segmentações)
CREATE INDEX IF NOT EXISTS idx_eventos_data ON public.eventos(data);
CREATE INDEX IF NOT EXISTS idx_eventos_exibir_aluno ON public.eventos(exibir_aluno) WHERE exibir_aluno = true;
CREATE INDEX IF NOT EXISTS idx_eventos_exibir_instrutor ON public.eventos(exibir_instrutor) WHERE exibir_instrutor = true;
CREATE INDEX IF NOT EXISTS idx_eventos_target_grupo ON public.eventos(target_grupo);

-- 7. Tabela de Perfis de Usuário (RLS e checagem de cargos administrativos no login)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
