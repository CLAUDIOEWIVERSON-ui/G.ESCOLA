-- Migration to add qtd_modulos to public.cursos
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS qtd_modulos INTEGER DEFAULT 4;
