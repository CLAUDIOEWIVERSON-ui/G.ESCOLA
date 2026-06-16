-- Migration 41: Add target_grupo to eventos for group-specific targeting (GAT, MAN, AMBOS)
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS target_grupo TEXT NOT NULL DEFAULT 'AMBOS';
