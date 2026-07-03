-- Migration 32: Allow 'AMBOS' in profiles.grupo_responsavel constraint
-- This allows instructors to belong to BOTH groups (MAN and GAT) and determines the courses/turmas they see.

DO $$
DECLARE
    cons_name TEXT;
BEGIN
    -- Find constraint name on profiles table for grupo_responsavel column
    SELECT c.conname INTO cons_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'profiles' 
      AND c.contype = 'c' 
      AND a.attname = 'grupo_responsavel';

    IF cons_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(cons_name);
    END IF;
END $$;

-- Ensure column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grupo_responsavel TEXT;

-- Add new check constraint that supports GAT, MAN and AMBOS
ALTER TABLE public.profiles ADD CONSTRAINT profiles_grupo_responsavel_check 
    CHECK (grupo_responsavel IN ('MAN', 'GAT', 'AMBOS'));
