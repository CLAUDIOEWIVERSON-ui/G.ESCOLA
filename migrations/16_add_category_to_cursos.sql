-- Migration to add category to cursos table
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Recommended: add a check constraint if we want to enforce values at the DB level
-- ALTER TABLE public.cursos ADD CONSTRAINT check_categoria 
-- CHECK (categoria IN ('Expedito', 'Especial', 'Carreira') OR categoria IS NULL);
