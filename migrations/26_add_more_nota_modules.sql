-- Migration to add more grade modules (nota6 to nota10) to 'notas' table
-- and update the average calculation trigger for up to 10 modules.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota6') THEN
        ALTER TABLE public.notas ADD COLUMN nota6 NUMERIC CHECK (nota6 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota7') THEN
        ALTER TABLE public.notas ADD COLUMN nota7 NUMERIC CHECK (nota7 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota8') THEN
        ALTER TABLE public.notas ADD COLUMN nota8 NUMERIC CHECK (nota8 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota9') THEN
        ALTER TABLE public.notas ADD COLUMN nota9 NUMERIC CHECK (nota9 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota10') THEN
        ALTER TABLE public.notas ADD COLUMN nota10 NUMERIC CHECK (nota10 >= 0);
    END IF;
END $$;

-- Update the average calculation trigger
CREATE OR REPLACE FUNCTION calculate_nota_final()
RETURNS TRIGGER AS $$
DECLARE
  total NUMERIC := 0;
  count INTEGER := 0;
BEGIN
  IF NEW.nota1 IS NOT NULL THEN
    total := total + NEW.nota1;
    count := count + 1;
  END IF;
  IF NEW.nota2 IS NOT NULL THEN
    total := total + NEW.nota2;
    count := count + 1;
  END IF;
  IF NEW.nota3 IS NOT NULL THEN
    total := total + NEW.nota3;
    count := count + 1;
  END IF;
  IF NEW.nota4 IS NOT NULL THEN
    total := total + NEW.nota4;
    count := count + 1;
  END IF;
  IF NEW.nota5 IS NOT NULL THEN
    total := total + NEW.nota5;
    count := count + 1;
  END IF;
  IF NEW.nota6 IS NOT NULL THEN
    total := total + NEW.nota6;
    count := count + 1;
  END IF;
  IF NEW.nota7 IS NOT NULL THEN
    total := total + NEW.nota7;
    count := count + 1;
  END IF;
  IF NEW.nota8 IS NOT NULL THEN
    total := total + NEW.nota8;
    count := count + 1;
  END IF;
  IF NEW.nota9 IS NOT NULL THEN
    total := total + NEW.nota9;
    count := count + 1;
  END IF;
  IF NEW.nota10 IS NOT NULL THEN
    total := total + NEW.nota10;
    count := count + 1;
  END IF;

  IF count > 0 THEN
    NEW.nota_final := total / count;
  ELSE
    NEW.nota_final := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
