-- Migration to ensure all required columns exist in the 'turmas' table
DO $$ 
BEGIN
    -- Add instrutor if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='turmas' AND column_name='instrutor') THEN
        ALTER TABLE public.turmas ADD COLUMN instrutor TEXT;
    END IF;

    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='turmas' AND column_name='status') THEN
        -- Re-ensure type exists
        BEGIN
            CREATE TYPE turma_status_enum AS ENUM ('ativa', 'concluída', 'cancelada');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
        ALTER TABLE public.turmas ADD COLUMN status turma_status_enum DEFAULT 'ativa';
    END IF;

    -- Add internacional if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='turmas' AND column_name='internacional') THEN
        ALTER TABLE public.turmas ADD COLUMN internacional BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add localizacao if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='turmas' AND column_name='localizacao') THEN
        ALTER TABLE public.turmas ADD COLUMN localizacao TEXT;
    END IF;

    -- Add data_inicio if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='turmas' AND column_name='data_inicio') THEN
        ALTER TABLE public.turmas ADD COLUMN data_inicio DATE;
    END IF;

    -- Add data_fim if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='turmas' AND column_name='data_fim') THEN
        ALTER TABLE public.turmas ADD COLUMN data_fim DATE;
    END IF;

END $$;
