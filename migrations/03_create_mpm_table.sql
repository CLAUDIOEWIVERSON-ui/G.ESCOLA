-- Table for MPM (Módulo de Planejamento de Metas / Matriz de Planejamento Modular)
CREATE TABLE IF NOT EXISTS public.mpm_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID REFERENCES public.cursos(id) NOT NULL,
  modulo_numero INTEGER NOT NULL,
  disciplina_id UUID REFERENCES public.disciplinas(id),
  carga_horaria_teorica INTEGER DEFAULT 0,
  carga_horaria_pratica INTEGER DEFAULT 0,
  objetivos TEXT,
  metodologia TEXT,
  avaliacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.mpm_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.mpm_map FOR ALL USING (auth.role() = 'authenticated');
