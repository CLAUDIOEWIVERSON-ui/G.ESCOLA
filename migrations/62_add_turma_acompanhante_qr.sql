-- Migration 62: Suporte para vincular Acompanhante (Monitor da Turma) diretamente na turma com QR Code exclusivo de acesso

ALTER TABLE IF EXISTS public.turmas
  ADD COLUMN IF NOT EXISTS acompanhante_nome text;

ALTER TABLE IF EXISTS public.turmas
  ADD COLUMN IF NOT EXISTS acompanhante_user_id uuid;

CREATE TABLE IF NOT EXISTS public.acompanhante_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL UNIQUE REFERENCES public.turmas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  access_code text NOT NULL UNIQUE,
  access_status text NOT NULL DEFAULT 'active',
  last_login timestamptz NULL,
  login_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acompanhante_access_codes_code
  ON public.acompanhante_access_codes (access_code);

CREATE INDEX IF NOT EXISTS idx_acompanhante_access_codes_user_id
  ON public.acompanhante_access_codes (user_id);

ALTER TABLE public.acompanhante_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acompanhante_access_codes_service_all" ON public.acompanhante_access_codes;
CREATE POLICY "acompanhante_access_codes_service_all"
  ON public.acompanhante_access_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
