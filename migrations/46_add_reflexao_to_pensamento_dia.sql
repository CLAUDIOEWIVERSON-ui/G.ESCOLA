-- Migration 46: Add reflexao column to pensamento_dia table
ALTER TABLE public.pensamento_dia ADD COLUMN IF NOT EXISTS reflexao TEXT;
