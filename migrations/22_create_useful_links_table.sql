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
  'MARINHA DO BRASIL',
  'https://www.marinha.mil.br/',
  'Acesse o site oficial da Marinha do Brasil.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110002',
  'BONO MARINHA',
  'https://bono.marinha.mil.br/',
  'Boletim de Ordens e Notícias.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110003',
  'ZIMBRA MARINHA',
  'https://webmail.marinha.mil.br/?client=preferred',
  'Acesso ao correio eletrônico.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110004',
  'PORTAL MARINHA DO BRASIL',
  'https://portal.marinha.mil.br/logon/LogonPoint/tmindex.html',
  'Portal oficial da Marinha do Brasil.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110005',
  'BILHETE DE PAGAMENTO ONLINE',
  'https://bponline.marinha.mil.br/bponline/login',
  'Acesso ao sistema de pagamento online.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110006',
  'MARINE TRAFFIC',
  'https://www.marinetraffic.com/en/ais/home/centerx:-12.0/centery:25.0/zoom:4',
  'Monitoramento de navios em tempo real.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110007',
  'VESSEL FINDER',
  'https://www.vesselfinder.com/',
  'Rastreamento global de embarcações.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110008',
  'NOAA',
  'https://www.noaa.gov/',
  'Meteorologia e oceanografia oficial dos EUA.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110009',
  'INTERNATIONAL MARITIME BUREAU (IMB)',
  'https://www.icc-ccs.org/piracy-reporting-centre',
  'Relatórios globais de pirataria marítima e crimes no mar.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110010',
  'MARITIME EXECUTIVE',
  'https://www.maritime-executive.com/',
  'Notícias globais sobre shipping e segurança marítima.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110011',
  'SEATRADE MARITIME NEWS',
  'https://www.seatrade-maritime.com/',
  'Notícias do setor marítimo global.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110012',
  'TRADEWINDS NEWS',
  'https://www.tradewindsnews.com/',
  'Notícias especializadas em shipping e frota global.',
  'external'
),

(
  'c3194511-bba0-42f8-9a3c-b171f1110013',
  'SAFETY4SEA',
  'https://safety4sea.com/',
  'Segurança marítima, pirataria e regulamentação naval.',
  'external'
)

ON CONFLICT (id) DO NOTHING;