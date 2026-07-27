-- Add "pré-inscrito" to turma_status_enum
ALTER TYPE turma_status_enum ADD VALUE IF NOT EXISTS 'pré-inscrito';
