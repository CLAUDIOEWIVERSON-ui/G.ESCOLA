-- Migration to add 'funcao' column to 'alunos' table
-- This supports saving the student's current role / function.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='funcao') THEN
        ALTER TABLE public.alunos ADD COLUMN funcao TEXT;
    END IF;
END $$;
