-- Migration 52: Add documento_criacao to turmas table
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS documento_criacao TEXT;
