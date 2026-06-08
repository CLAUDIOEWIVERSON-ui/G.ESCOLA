-- Migration: Add column uniforme_dia to table eventos
-- Description: Campo para cadastrar o uniforme sugerido ou exigido no dia do evento.
-- Visibilidade: Alunos no calendário e na barra de avisos animada.

ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS uniforme_dia TEXT;
