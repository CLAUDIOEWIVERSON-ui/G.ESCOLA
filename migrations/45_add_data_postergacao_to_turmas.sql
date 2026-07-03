-- Migration 45: Add data_postergacao column to turmas
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS data_postergacao DATE;
