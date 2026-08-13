-- Migração 57: Adiciona a coluna endereco na tabela de alunos
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS endereco TEXT;
