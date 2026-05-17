-- Migration to add gender column to alunos table
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS genero TEXT DEFAULT 'masculino';
