-- Migration: Create horarios table
CREATE TABLE IF NOT EXISTS public.horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) NOT NULL UNIQUE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON public.horarios FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage horarios" ON public.horarios FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.horarios;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.horarios
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
