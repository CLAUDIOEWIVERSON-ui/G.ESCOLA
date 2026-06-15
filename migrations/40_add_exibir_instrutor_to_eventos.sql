-- Migration 40: Add exibir_instrutor to eventos for granular targeting in Administrative Agenda
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS exibir_instrutor BOOLEAN NOT NULL DEFAULT TRUE;
