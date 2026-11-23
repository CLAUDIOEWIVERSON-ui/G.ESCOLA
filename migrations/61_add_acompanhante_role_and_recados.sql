-- Migration 61: Adiciona perfil 'acompanhante' (Acompanhante de Turma) e tabela recados_alunos

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'user_role_enum'
        AND e.enumlabel = 'acompanhante'
    ) THEN
      ALTER TYPE user_role_enum ADD VALUE 'acompanhante';
    END IF;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.recados_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT 'Acompanhante de Turma',
  titulo text NOT NULL DEFAULT 'Recado do Acompanhante da Turma',
  mensagem text NOT NULL,
  lido boolean NOT NULL DEFAULT false,
  lido_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recados_alunos_turma_id ON public.recados_alunos (turma_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recados_alunos_aluno_id ON public.recados_alunos (aluno_id, created_at DESC);

ALTER TABLE public.recados_alunos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recados_alunos_service_all" ON public.recados_alunos;
CREATE POLICY "recados_alunos_service_all"
  ON public.recados_alunos
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
