-- Migration to ensure eventos table exists and is correctly configured
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data TIMESTAMPTZ NOT NULL,
  cor TEXT DEFAULT 'bg-blue-600',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Public read access') THEN
        CREATE POLICY "Public read access" ON public.eventos FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Admins have full access') THEN
        CREATE POLICY "Admins have full access" ON public.eventos FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
