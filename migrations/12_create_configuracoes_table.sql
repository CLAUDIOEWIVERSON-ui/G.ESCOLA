-- Migration to ensure configuracoes table exists
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_aprovacao DECIMAL(4,2) DEFAULT 7.0,
  media_recuperacao DECIMAL(4,2) DEFAULT 5.0,
  frequencia_minima INTEGER DEFAULT 75,
  ano_letivo_atual INTEGER DEFAULT 2024,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial config if not exists
INSERT INTO public.configuracoes (media_aprovacao, media_recuperacao, frequencia_minima, ano_letivo_atual)
SELECT 7.0, 5.0, 75, 2024
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes);

-- RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes' AND policyname = 'Public read access') THEN
        CREATE POLICY "Public read access" ON public.configuracoes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes' AND policyname = 'Admins have full access') THEN
        CREATE POLICY "Admins have full access" ON public.configuracoes FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
