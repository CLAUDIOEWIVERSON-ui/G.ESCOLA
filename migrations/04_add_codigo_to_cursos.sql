-- Migration to add 'codigo' column to 'cursos' table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='codigo') THEN
        ALTER TABLE public.cursos ADD COLUMN codigo TEXT;
    END IF;
END $$;
