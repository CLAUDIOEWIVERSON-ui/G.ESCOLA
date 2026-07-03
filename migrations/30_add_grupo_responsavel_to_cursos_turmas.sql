-- Migration 30: Add grupo_responsavel to cursos, turmas and profiles
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS grupo_responsavel TEXT CHECK (grupo_responsavel IN ('MAN', 'GAT'));
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS grupo_responsavel TEXT CHECK (grupo_responsavel IN ('MAN', 'GAT'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grupo_responsavel TEXT CHECK (grupo_responsavel IN ('MAN', 'GAT'));
