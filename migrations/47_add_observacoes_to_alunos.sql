-- Migration 47: Add observations (observações pedagógicas e disciplinares) to alunos table
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS observacoes TEXT;
