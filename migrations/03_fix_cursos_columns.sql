-- Migration to ensure all required columns exist in the 'cursos' table
-- This handles cases where the table was created partially

DO $$ 
BEGIN
    -- Add ano_inicio if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='ano_inicio') THEN
        ALTER TABLE public.cursos ADD COLUMN ano_inicio INTEGER;
    END IF;

    -- Add ativo if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='ativo') THEN
        ALTER TABLE public.cursos ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add internacional if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='internacional') THEN
        ALTER TABLE public.cursos ADD COLUMN internacional BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add localizacao if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='localizacao') THEN
        ALTER TABLE public.cursos ADD COLUMN localizacao TEXT;
    END IF;

    -- Add data_inicio if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='data_inicio') THEN
        ALTER TABLE public.cursos ADD COLUMN data_inicio DATE;
    END IF;

    -- Add data_fim if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='data_fim') THEN
        ALTER TABLE public.cursos ADD COLUMN data_fim DATE;
    END IF;

    -- Add deleted_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='deleted_at') THEN
        ALTER TABLE public.cursos ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

END $$;
