-- Migration to add instrutor column to turmas table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='turmas' AND column_name='instrutor') THEN
        ALTER TABLE public.turmas ADD COLUMN instrutor TEXT;
    END IF;
END $$;
