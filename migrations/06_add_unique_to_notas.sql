-- Migration to add unique constraint to 'notas' table to allow safer upserts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_aluno_disciplina_turma'
    ) THEN
        ALTER TABLE public.notas 
        ADD CONSTRAINT unique_aluno_disciplina_turma UNIQUE(aluno_id, disciplina_id, turma_id);
    END IF;
END $$;
