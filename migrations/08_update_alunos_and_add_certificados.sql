-- Migration to add parent names and voter ID to alunos, and create certificados table
ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS nome_pai TEXT,
ADD COLUMN IF NOT EXISTS nome_mae TEXT,
ADD COLUMN IF NOT EXISTS titulo_eleitor TEXT;

-- Create certificados table
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id),
  turma_id UUID REFERENCES public.turmas(id),
  curso_id UUID REFERENCES public.cursos(id),
  tipo TEXT CHECK (tipo IN ('certificado', 'diploma')),
  template_data JSONB DEFAULT '{}'::jsonb,
  url TEXT, -- If uploaded
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.certificados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
