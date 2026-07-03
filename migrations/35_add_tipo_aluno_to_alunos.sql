-- Migração: Adiciona coluna tipo_aluno na tabela de alunos
-- Permite diferenciar o aluno se ele é Militar ou Civil
-- E consequentemente atualizar o avatar correspondente

ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS tipo_aluno TEXT NOT NULL DEFAULT 'militar';
