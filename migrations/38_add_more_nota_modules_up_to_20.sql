-- Migration to add more grade modules (nota11 to nota20) to 'notas' table
-- and update the average calculation trigger for up to 20 modules.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota11') THEN
        ALTER TABLE public.notas ADD COLUMN nota11 \NUMERIC CHECK (nota11 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota12') THEN
        ALTER TABLE public.notas ADD COLUMN nota12 NUMERIC CHECK (nota12 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota13') THEN
        ALTER TABLE public.notas ADD COLUMN nota13 NUMERIC CHECK (nota13 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota14') THEN
        ALTER TABLE public.notas ADD COLUMN nota14 NUMERIC CHECK (nota14 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota15') THEN
        ALTER TABLE public.notas ADD COLUMN nota15 NUMERIC CHECK (nota15 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota16') THEN
        ALTER TABLE public.notas ADD COLUMN nota16 NUMERIC CHECK (nota16 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota17') THEN
        ALTER TABLE public.notas ADD COLUMN nota17 NUMERIC CHECK (nota17 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota18') THEN
        ALTER TABLE public.notas ADD COLUMN nota18 NUMERIC CHECK (nota18 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota19') THEN
        ALTER TABLE public.notas ADD COLUMN nota19 NUMERIC CHECK (nota19 >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas' AND column_name='nota20') THEN
        ALTER TABLE public.notas ADD COLUMN nota20 NUMERIC CHECK (nota20 >= 0);
    END IF;
END $$;

-- Update the average calculation trigger for all 20 modules
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
  IF NEW.nota11 IS NOT NULL THEN
    total := total + NEW.nota11;
    count := count + 1;
  END IF;
  IF NEW.nota12 IS NOT NULL THEN
    total := total + NEW.nota12;
    count := count + 1;
  END IF;
  IF NEW.nota13 IS NOT NULL THEN
    total := total + NEW.nota13;
    count := count + 1;
  END IF;
  IF NEW.nota14 IS NOT NULL THEN
    total := total + NEW.nota14;
    count := count + 1;
  END IF;
  IF NEW.nota15 IS NOT NULL THEN
    total := total + NEW.nota15;
    count := count + 1;
  END IF;
  IF NEW.nota16 IS NOT NULL THEN
    total := total + NEW.nota16;
    count := count + 1;
  END IF;
  IF NEW.nota17 IS NOT NULL THEN
    total := total + NEW.nota17;
    count := count + 1;
  END IF;
  IF NEW.nota18 IS NOT NULL THEN
    total := total + NEW.nota18;
    count := count + 1;
  END IF;
  IF NEW.nota19 IS NOT NULL THEN
    total := total + NEW.nota19;
    count := count + 1;
  END IF;
  IF NEW.nota20 IS NOT NULL THEN
    total := total + NEW.nota20;
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
