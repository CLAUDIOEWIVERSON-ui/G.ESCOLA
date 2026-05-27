-- Create useful_links table
CREATE TABLE IF NOT EXISTS public.useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid migration crash
DROP POLICY IF EXISTS "Public read access" ON public.useful_links;
DROP POLICY IF EXISTS "Admins have full access" ON public.useful_links;

-- Create Policies
CREATE POLICY "Public read access" ON public.useful_links FOR SELECT USING (true);
CREATE POLICY "Admins have full access" ON public.useful_links FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed initial useful links if they don't exist
INSERT INTO public.useful_links (id, name, url, description, category)
VALUES
  ('c3194511-bba0-42f8-9a3c-b171f1110001', 'Portal do Aluno', 'https://portal.escola.edu', 'Acesse notas, boletins parciais, grade horária e realize rematrículas online.', 'academic'),
  ('c3194511-bba0-42f8-9a3c-b171f1110002', 'Ambiente Virtual EaD (Moodle)', 'https://ead.escola.edu', 'Plataforma oficial de ensino a distância com aulas gravadas, fóruns de discussão e fórum de dúvidas.', 'academic'),
  ('c3194511-bba0-42f8-9a3c-b171f1110003', 'Biblioteca Digital Integrada', 'https://biblioteca.escola.edu', 'Acesso ao acervo online de livros acadêmicos recomendados, artigos científicos de alta qualidade e periódicos.', 'library'),
  ('c3194511-bba0-42f8-9a3c-b171f1110004', 'Suporte de TI e Service Desk', 'https://suporte.escola.edu', 'Abertura de chamados técnicos para problemas relacionados a login institucional, rede wi-fi ou infraestrutura.', 'admin'),
  ('c3194511-bba0-42f8-9a3c-b171f1110005', 'Calendário Acadêmico Oficial 2024', 'https://escola.edu/calendario-2024.pdf', 'Visualização e download do calendário letivo contendo datas de provas, recessos e eventos acadêmicos marcantes.', 'academic'),
  ('c3194511-bba0-42f8-9a3c-b171f1110006', 'Webmail Institucional G-Suite', 'https://mail.google.com/a/escola.edu', 'Acesse sua caixa postal corporativa e ferramentas colaborativas integradas da conta escolar.', 'external'),
  ('c3194511-bba0-42f8-9a3c-b171f1110007', 'Periódicos CAPES & Google Acadêmico', 'https://www.periodicos.capes.gov.br', 'Bases externas e externas de inteligência, pesquisas, teses e publicações científicas renomadas.', 'external')
ON CONFLICT (id) DO NOTHING;
