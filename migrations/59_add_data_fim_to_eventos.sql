-- Migração 59: Adiciona colunas data_fim e tipo_data na tabela eventos para suporte a Período do Aviso / Data Fixa
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS data_fim TIMESTAMPTZ;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS tipo_data TEXT DEFAULT 'fixa';
