-- Migration to drop the hardcoded maximum of 10 for grades on the 'notas' table
-- and allow any grade within the range configured in the configurations table.

DO $$
BEGIN
    -- Drop old check constraints if they exist (PostgreSQL names them automatically as table_column_check)
    ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_nota1_check;
    ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_nota2_check;
    ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_nota3_check;
    ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_nota4_check;
    ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_nota5_check;

    -- Alter column types from NUMERIC(3,1) to NUMERIC (removing limit on precision/scale, or allowing larger numbers)
    ALTER TABLE public.notas ALTER COLUMN nota1 TYPE NUMERIC;
    ALTER TABLE public.notas ALTER COLUMN nota2 TYPE NUMERIC;
    ALTER TABLE public.notas ALTER COLUMN nota3 TYPE NUMERIC;
    ALTER TABLE public.notas ALTER COLUMN nota4 TYPE NUMERIC;
    ALTER TABLE public.notas ALTER COLUMN nota5 TYPE NUMERIC;
    ALTER TABLE public.notas ALTER COLUMN nota_final TYPE NUMERIC;

    -- Add check constraints to enforce only non-negative values
    -- Any upper bound limit is now validated at the application/configuration level
    ALTER TABLE public.notas ADD CONSTRAINT check_nota1_positive CHECK (nota1 >= 0);
    ALTER TABLE public.notas ADD CONSTRAINT check_nota2_positive CHECK (nota2 >= 0);
    ALTER TABLE public.notas ADD CONSTRAINT check_nota3_positive CHECK (nota3 >= 0);
    ALTER TABLE public.notas ADD CONSTRAINT check_nota4_positive CHECK (nota4 >= 0);
    ALTER TABLE public.notas ADD CONSTRAINT check_nota5_positive CHECK (nota5 >= 0);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'An error occurred during migration: %', SQLERRM;
END $$;
