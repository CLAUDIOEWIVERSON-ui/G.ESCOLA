-- Migration: Add exibir_aluno to eventos table
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS exibir_aluno BOOLEAN DEFAULT false;
