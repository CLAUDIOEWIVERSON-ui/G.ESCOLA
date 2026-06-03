-- Migration 33: Remove grupo_responsavel CHECK constraints to allow arbitrary groups
DO $$
DECLARE
    row RECORD;
BEGIN
    -- Drop check constraints on cursos for grupo_responsavel
    FOR row IN 
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'cursos' 
          AND c.contype = 'c' 
          AND a.attname = 'grupo_responsavel'
    LOOP
        EXECUTE 'ALTER TABLE public.cursos DROP CONSTRAINT ' || quote_ident(row.conname);
    END LOOP;

    -- Drop check constraints on turmas for grupo_responsavel
    FOR row IN 
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'turmas' 
          AND c.contype = 'c' 
          AND a.attname = 'grupo_responsavel'
    LOOP
        EXECUTE 'ALTER TABLE public.turmas DROP CONSTRAINT ' || quote_ident(row.conname);
    END LOOP;

    -- Drop check constraints on profiles for grupo_responsavel
    FOR row IN 
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'profiles' 
          AND c.contype = 'c' 
          AND a.attname = 'grupo_responsavel'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(row.conname);
    END LOOP;
END $$;
