-- Create materias_modulos table to describe what is covered in each module of a discipline
CREATE TABLE IF NOT EXISTS public.materias_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id UUID REFERENCES public.disciplinas(id) ON DELETE CASCADE NOT NULL,
  modulo_index INTEGER NOT NULL, -- 1-based index based on curso.qtd_modulos
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.materias_modulos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON public.materias_modulos FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Admins have full access" ON public.materias_modulos FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS materias_modulos_disciplina_id_idx ON public.materias_modulos(disciplina_id);
CREATE INDEX IF NOT EXISTS materias_modulos_modulo_index_idx ON public.materias_modulos(modulo_index);
