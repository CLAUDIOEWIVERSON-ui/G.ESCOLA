-- Migration: Add eventos table
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data TIMESTAMPTZ NOT NULL,
  cor TEXT DEFAULT 'bg-blue-600',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Admins have full access" ON public.eventos FOR ALL USING (auth.role() = 'authenticated');
