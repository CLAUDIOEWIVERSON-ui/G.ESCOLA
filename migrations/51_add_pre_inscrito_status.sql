-- Add "pré-inscrito(a)(s)" to turma_status_enum
ALTER TYPE turma_status_enum ADD VALUE IF NOT EXISTS 'pré-inscrito(a)(s)';
