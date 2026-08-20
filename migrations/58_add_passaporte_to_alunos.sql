-- Migração 58: Adiciona a coluna passaporte na tabela de alunos para turmas no exterior / controle de viagens
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS passaporte TEXT;
