-- Migração 60: Tabela de histórico de acessos de usuários ao sistema
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
  path TEXT,
  action TEXT,
  status_code INTEGER DEFAULT 200,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs (user_id);
