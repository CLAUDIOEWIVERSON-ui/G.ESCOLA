-- Migration 63: Add exibir_monitor to eventos for granular targeting of Class Monitors in Administrative Agenda
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS exibir_monitor BOOLEAN NOT NULL DEFAULT TRUE;
