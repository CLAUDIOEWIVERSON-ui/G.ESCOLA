-- Migration: Add observacao column to frequencia table to store attendance remarks, late states, or justified absence status.
ALTER TABLE public.frequencia ADD COLUMN IF NOT EXISTS observacao TEXT;
