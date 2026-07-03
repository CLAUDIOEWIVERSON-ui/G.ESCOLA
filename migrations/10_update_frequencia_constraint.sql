-- Migration: Fix unique constraint for frequencia to handle NULLs in disciplina_id properly
-- Using a partial index strategy for better compatibility with older Postgres versions
ALTER TABLE public.frequencia DROP CONSTRAINT IF EXISTS frequencia_unique_record;
ALTER TABLE public.frequencia DROP CONSTRAINT IF EXISTS frequencia_unique_record_no_disc;

-- 1. Index for when discipline is specified
CREATE UNIQUE INDEX IF NOT EXISTS frequencia_uidx_with_disc ON public.frequencia (aluno_id, turma_id, disciplina_id, data) WHERE disciplina_id IS NOT NULL;

-- 2. Index for when discipline is NULL (General Attendance)
CREATE UNIQUE INDEX IF NOT EXISTS frequencia_uidx_null_disc ON public.frequencia (aluno_id, turma_id, data) WHERE disciplina_id IS NULL;
