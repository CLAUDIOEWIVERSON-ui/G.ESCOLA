-- Migration 37: Reorganize educational hierarchy (Course -> Module -> Discipline -> Topic)
-- Ensures the modulo_index column exists on the disciplines table to assign subjects directly to modules.
-- Topics (materias_modulos) are nested under their respective discipline.

ALTER TABLE public.disciplinas ADD COLUMN IF NOT EXISTS modulo_index INTEGER DEFAULT 1;

-- Comment describing the new column purpose
COMMENT ON COLUMN public.disciplinas.modulo_index IS 'Define a qual módulo do curso esta disciplina pertence (hierarquia: Curso -> Módulo -> Disciplina -> Tópico)';
