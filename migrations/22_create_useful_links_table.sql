-- Enable extension if necessary
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create useful_links table
CREATE TABLE IF NOT EXISTS public.useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,

  category TEXT NOT NULL CHECK (
    category IN ('academic', 'library', 'admin', 'external')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional indexes
CREATE INDEX IF NOT EXISTS idx_useful_links_category
ON public.useful_links(category);

CREATE INDEX IF NOT EXISTS idx_useful_links_created_at
ON public.useful_links(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;

-- Remove old policies safely
DROP POLICY IF EXISTS "Public read access" ON public.useful_links;
DROP POLICY IF EXISTS "Admins have full access" ON public.useful_links;

-- Public read access
CREATE POLICY "Public read access"
ON public.useful_links
FOR SELECT
USING (true);

-- Admin full access
CREATE POLICY "Admins have full access"
ON public.useful_links
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_useful_links_updated_at
ON public.useful_links;

CREATE TRIGGER update_useful_links_updated_at
BEFORE UPDATE ON public.useful_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.useful_links (
  id,
  name,
  url,
  description,
  category
)
VALUES
(
  'c3194511-bba0-42f8-9a3c-b171f1110001',
  'Portal do Aluno',
  'https://portal.escola.edu',
  'Acesse notas, boletins parciais, grade horária e realize rematrículas online.',
  'academic'
),
(
  'c3194511-bba0-42f8-9a3c-b171f1110002',
  'Ambiente Virtual EaD (Moodle)',
  'https://ead.escola.edu',
  'Plataforma oficial de ensino a distância com aulas gravadas, fóruns de discussão e fórum de dúvidas.',
  'academic'
),
(
  'c3194511-bba0-42f8-9a3c-b171f1110003',
  'Biblioteca Digital Integrada',
  'https://biblioteca.escola.edu',
  'Acesso ao acervo online de livros acadêmicos recomendados, artigos científicos e periódicos.',
  'library'
),
(
  'c3194511-bba0-42f8-9a3c-b171f1110004',
  'Suporte de TI e Service Desk',
  'https://suporte.escola.edu',
  'Abertura de chamados técnicos relacionados a login institucional, rede wi-fi e infraestrutura.',
  'admin'
),
(
  'c3194511-bba0-42f8-9a3c-b171f1110005',
  'Calendário Acadêmico Oficial 2024',
  'https://escola.edu/calendario-2024.pdf',
  'Calendário letivo contendo provas, recessos e eventos acadêmicos.',
  'academic'
),
(
  'c3194511-bba0-42f8-9a3c-b171f1110006',
  'Webmail Institucional G-Suite',
  'https://mail.google.com/a/escola.edu',
  'Acesse sua caixa postal corporativa e ferramentas colaborativas.',
  'external'
),
(
  'c3194511-bba0-42f8-9a3c-b171f1110007',
  'Periódicos CAPES & Google Acadêmico',
  'https://www.periodicos.capes.gov.br',
  'Bases externas de pesquisas, teses e publicações científicas.',
  'external'
)
ON CONFLICT (id) DO NOTHING;