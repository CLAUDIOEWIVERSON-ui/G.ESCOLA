-- Migração 48: Adiciona a coluna liberar_formularios na tabela de turmas para permitir a liberação do formulário de avaliação pós-escolar.
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS liberar_formularios BOOLEAN NOT NULL DEFAULT FALSE;
