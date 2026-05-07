-- Migration to ensure frequencia table exists
CREATE TABLE IF NOT EXISTS public.frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) NOT NULL,
  disciplina_id UUID REFERENCES public.disciplinas(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  presente BOOLEAN DEFAULT TRUE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Constraints (unique index) are handled in migration 10.
-- We just ensure the base table exists here if it doesn't.

-- RLS
ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'frequencia' AND policyname = 'Admins have full access') THEN
        CREATE POLICY "Admins have full access" ON public.frequencia FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_frequencia_turma_data ON public.frequencia(turma_id, data);
