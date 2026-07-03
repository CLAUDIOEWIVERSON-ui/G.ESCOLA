-- Migration 31: Create pensamento_dia table and insert initial quote
CREATE TABLE IF NOT EXISTS public.pensamento_dia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    texto TEXT NOT NULL,
    autor VARCHAR(255) NOT NULL,
    data_exibicao DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pensamento_dia ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to select
CREATE POLICY "Allow authenticated read access"
ON public.pensamento_dia
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert/update entries
CREATE POLICY "Allow authenticated insert/update access"
ON public.pensamento_dia
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert a default thought for today if none exists to avoid empty states
INSERT INTO public.pensamento_dia (texto, autor, data_exibicao)
VALUES (
  'A vida é uma peça de teatro que não permite ensaios. Por isso, cante, chore, dance, ria e viva intensamente, antes que a cortina se feche.',
  'Charlie Chaplin',
  CURRENT_DATE
)
ON CONFLICT (data_exibicao) DO NOTHING;
