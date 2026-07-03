-- Migration to add more grade modules to 'notas' table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota3') THEN
        ALTER TABLE public.notas ADD COLUMN nota3 NUMERIC(3,1) CHECK (nota3 >= 0 AND nota3 <= 10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota4') THEN
        ALTER TABLE public.notas ADD COLUMN nota4 NUMERIC(3,1) CHECK (nota4 >= 0 AND nota4 <= 10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota5') THEN
        ALTER TABLE public.notas ADD COLUMN nota5 NUMERIC(3,1) CHECK (nota5 >= 0 AND nota5 <= 10);
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

  IF count > 0 THEN
    NEW.nota_final := total / count;
  ELSE
    NEW.nota_final := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
