-- Migration to reformulate configuracoes table with max grade and recovery limits
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS nota_maxima DECIMAL(4,2) DEFAULT 10.0;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS nota_aprovacao DECIMAL(4,2) DEFAULT 7.0;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS nota_recuperacao DECIMAL(4,2) DEFAULT 5.0;

-- Update existing rows if any
UPDATE public.configuracoes SET 
  nota_aprovacao = media_aprovacao,
  nota_recuperacao = media_recuperacao;
