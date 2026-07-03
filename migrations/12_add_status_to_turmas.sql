-- Migration: Add status to turmas
DO $$ BEGIN
    CREATE TYPE turma_status_enum AS ENUM ('ativa', 'concluída', 'cancelada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS status turma_status_enum DEFAULT 'ativa';

-- Migrate existing 'ativa' values to 'status'
UPDATE public.turmas SET status = 'ativa' WHERE ativa = TRUE;
UPDATE public.turmas SET status = 'concluída' WHERE ativa = FALSE;
