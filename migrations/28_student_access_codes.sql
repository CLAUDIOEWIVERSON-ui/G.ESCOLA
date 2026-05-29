-- Migration: Create Student Access Codes table & triggers
-- Setup table, generate codes for existing students, configure constraints, and RLS policies

CREATE TABLE IF NOT EXISTS public.student_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE UNIQUE,
  class_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  access_status TEXT DEFAULT 'active' CHECK (access_status IN ('active', 'blocked')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0
);

-- Index for fast searches
CREATE INDEX IF NOT EXISTS idx_student_access_codes_code ON public.student_access_codes(access_code);
CREATE INDEX IF NOT EXISTS idx_student_access_codes_stu ON public.student_access_codes(student_id);

-- Parse / normalize Class Name prefix (e.g., "Turma 05" -> "T05")
CREATE OR REPLACE FUNCTION public.generate_student_turma_prefix(t_nome TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_nome TEXT;
  num_match TEXT;
BEGIN
  IF t_nome IS NULL THEN
    RETURN 'T99';
  END IF;
  clean_nome := upper(trim(t_nome));
  -- Check if starts with "TURMA XX" or "TXX" or "T-XX"
  num_match := substring(clean_nome from '^(?:TURMA|T)[-\s_]?([0-9]+)');
  IF num_match IS NOT NULL THEN
    RETURN 'T' || lpad(num_match, 2, '0');
  END IF;
  -- Abbreviate by initials
  RETURN COALESCE(nullif(substring(regexp_replace(clean_nome, '[^A-Z0-9]', '', 'g') from 1 for 4), ''), 'T99');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically generate Student Access Code on Insert or Update of Aluno
CREATE OR REPLACE FUNCTION public.trigger_on_aluno_insert()
RETURNS TRIGGER AS $$
DECLARE
  t_ano INTEGER;
  t_nome TEXT;
  t_prefix TEXT;
  next_seq INTEGER;
  seq_str TEXT;
  final_code TEXT;
  default_pass_hash TEXT;
BEGIN
  -- We ONLY generate if they are enrolled in a class/turma
  IF NEW.turma_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get class details
  SELECT ano, nome INTO t_ano, t_nome FROM public.turmas WHERE id = NEW.turma_id;
  IF t_ano IS NULL THEN
    t_ano := EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;
  
  t_prefix := public.generate_student_turma_prefix(t_nome);
  
  -- Calculate next sequence in that class
  SELECT COALESCE(MAX(substring(access_code from '[0-9]+$')::INTEGER), 0)
  INTO next_seq
  FROM public.student_access_codes
  WHERE class_id = NEW.turma_id;
  
  next_seq := next_seq + 1;
  seq_str := lpad(next_seq::TEXT, 4, '0');
  
  final_code := t_ano::TEXT || '-' || t_prefix || '-' || seq_str;
  
  -- Prevent potential duplicates
  WHILE EXISTS (SELECT 1 FROM public.student_access_codes WHERE access_code = final_code) LOOP
    next_seq := next_seq + 1;
    seq_str := lpad(next_seq::TEXT, 4, '0');
    final_code := t_ano::TEXT || '-' || t_prefix || '-' || seq_str;
  END LOOP;
  
  -- Hashed '123' as default password (SHA-256)
  default_pass_hash := 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

  -- Create or sync access code record
  INSERT INTO public.student_access_codes (student_id, class_id, access_code, password_hash, access_status)
  VALUES (NEW.id, NEW.turma_id, final_code, default_pass_hash, 'active')
  ON CONFLICT (student_id) DO UPDATE
  SET class_id = EXCLUDED.class_id,
      access_code = CASE 
        WHEN student_access_codes.class_id <> EXCLUDED.class_id THEN EXCLUDED.access_code 
        ELSE student_access_codes.access_code 
      END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_on_aluno_insert ON public.alunos;

CREATE TRIGGER trg_on_aluno_insert
  AFTER INSERT OR UPDATE OF turma_id
  ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_on_aluno_insert();

-- Run migrations for existing students in database
DO $$
DECLARE
  r RECORD;
  t_ano INTEGER;
  t_nome TEXT;
  t_prefix TEXT;
  next_seq INTEGER;
  seq_str TEXT;
  final_code TEXT;
  default_pass_hash TEXT;
BEGIN
  default_pass_hash := 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
  
  FOR r IN (
    SELECT id, nome, turma_id FROM public.alunos 
    WHERE id NOT IN (SELECT student_id FROM public.student_access_codes)
  ) LOOP
    IF r.turma_id IS NOT NULL THEN
      SELECT ano, nome INTO t_ano, t_nome FROM public.turmas WHERE id = r.turma_id;
      IF t_ano IS NULL THEN
        t_ano := EXTRACT(YEAR FROM CURRENT_DATE);
      END IF;
      
      t_prefix := public.generate_student_turma_prefix(t_nome);
      
      SELECT COALESCE(MAX(substring(access_code from '[0-9]+$')::INTEGER), 0)
      INTO next_seq
      FROM public.student_access_codes
      WHERE class_id = r.turma_id;
      
      next_seq := next_seq + 1;
      seq_str := lpad(next_seq::TEXT, 4, '0');
      
      final_code := t_ano::TEXT || '-' || t_prefix || '-' || seq_str;
      
      WHILE EXISTS (SELECT 1 FROM public.student_access_codes WHERE access_code = final_code) LOOP
        next_seq := next_seq + 1;
        seq_str := lpad(next_seq::TEXT, 4, '0');
        final_code := t_ano::TEXT || '-' || t_prefix || '-' || seq_str;
      END LOOP;
      
      INSERT INTO public.student_access_codes (student_id, class_id, access_code, password_hash, access_status)
      VALUES (r.id, r.turma_id, final_code, default_pass_hash, 'active')
      ON CONFLICT (student_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Row Level Security (RLS) setup
ALTER TABLE public.student_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to access codes" ON public.student_access_codes;
DROP POLICY IF EXISTS "Students can read their own access code" ON public.student_access_codes;

-- Admins can do anything
CREATE POLICY "Admins have full access to access codes" ON public.student_access_codes
  FOR ALL TO authenticated
  USING (
    COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'aluno') = 'admin'
  );

-- Alunos can only view their own access code
CREATE POLICY "Students can read their own access code" ON public.student_access_codes
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'aluno_nif_' || student_id::text || '@aluno.escola.digital'
  );
