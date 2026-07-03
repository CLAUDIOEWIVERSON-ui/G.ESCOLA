-- Migration to ensure all required columns exist in the 'alunos' table
-- This handles cases where the table was created partially

DO $$ 
BEGIN
    -- Add email if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='email') THEN
        ALTER TABLE public.alunos ADD COLUMN email TEXT UNIQUE;
    END IF;

    -- Add nif if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='nif') THEN
        ALTER TABLE public.alunos ADD COLUMN nif TEXT;
    END IF;

    -- Add rg if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='rg') THEN
        ALTER TABLE public.alunos ADD COLUMN rg TEXT;
    END IF;

    -- Add om if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='om') THEN
        ALTER TABLE public.alunos ADD COLUMN om TEXT;
    END IF;

    -- Add posto_graduacao if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='posto_graduacao') THEN
        ALTER TABLE public.alunos ADD COLUMN posto_graduacao TEXT;
    END IF;

    -- Add ano_admissao if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='ano_admissao') THEN
        ALTER TABLE public.alunos ADD COLUMN ano_admissao INTEGER;
    END IF;

    -- Add telefone if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='telefone') THEN
        ALTER TABLE public.alunos ADD COLUMN telefone TEXT;
    END IF;

    -- Add whatsapp if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='whatsapp') THEN
        ALTER TABLE public.alunos ADD COLUMN whatsapp TEXT;
    END IF;

    -- Add foto_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='foto_url') THEN
        ALTER TABLE public.alunos ADD COLUMN foto_url TEXT;
    END IF;

    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='status') THEN
        ALTER TABLE public.alunos ADD COLUMN status public.aluno_status_enum DEFAULT 'ativo';
    END IF;

END $$;
