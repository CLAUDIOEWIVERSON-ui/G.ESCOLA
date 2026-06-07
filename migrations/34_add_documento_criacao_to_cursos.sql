-- Migration 34: Add documento_criacao to cursos table
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS documento_criacao TEXT;
