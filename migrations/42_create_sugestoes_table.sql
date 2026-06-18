-- 42. Tabela de Sugestões de Melhoria ao TI
CREATE TABLE IF NOT EXISTS public.sugestoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'nova_funcionalidade', 'aprimoramento', 'outros'
  titulo TEXT NOT NULL,
  modulo TEXT,
  descricao TEXT NOT NULL,
  prioridade TEXT NOT NULL, -- 'baixa', 'media', 'alta'
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  usuario_email TEXT,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'em_analise', 'implementado', 'recusado'
  resposta_ti TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;

-- Remover políticas anteriores se existirem
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode criar sugestões" ON public.sugestoes;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias sugestões" ON public.sugestoes;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as sugestões" ON public.sugestoes;

-- Criar Políticas de RLS
CREATE POLICY "Qualquer usuário autenticado pode criar sugestões" ON public.sugestoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem ver suas próprias sugestões" ON public.sugestoes
  FOR SELECT USING (
    auth.uid() = usuario_id OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

CREATE POLICY "Admins podem gerenciar todas as sugestões" ON public.sugestoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
