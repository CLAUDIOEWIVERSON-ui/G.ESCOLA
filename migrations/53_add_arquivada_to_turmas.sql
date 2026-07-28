-- Add "arquivada" boolean to turmas
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS arquivada BOOLEAN DEFAULT FALSE;
