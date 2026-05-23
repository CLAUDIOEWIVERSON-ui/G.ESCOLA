-- Migration to create the 'horarios' table for weekly schedule management

CREATE TABLE IF NOT EXISTS public.horarios (
    turma_id UUID PRIMARY KEY REFERENCES public.turmas(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

-- Drop exist policies if any to prevent collision
DROP POLICY IF EXISTS "Admins have full access" ON public.horarios;
DROP POLICY IF EXISTS "Public read access" ON public.horarios;

-- Add policies
CREATE POLICY "Admins have full access" ON public.horarios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read access" ON public.horarios FOR SELECT USING (true);
