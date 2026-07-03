-- Migração para garantir a criação das tabelas de alunos e turmas (caso não existam)
-- Garante o acesso correto do aluno no sistema apenas com o NIF na turma cadastrada

-- 1. Criação dos enums necessários se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'periodo_enum') THEN
        CREATE TYPE periodo_enum AS ENUM ('manhã', 'tarde', 'noite');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'turma_status_enum') THEN
        CREATE TYPE turma_status_enum AS ENUM ('ativa', 'concluída', 'cancelada');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aluno_status_enum') THEN
        CREATE TYPE aluno_status_enum AS ENUM ('ativo', 'inativo', 'transferido');
    END IF;
END $$;

-- 2. Garantir existência da tabela public.cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  codigo TEXT,
  descricao TEXT,
  ano_inicio INTEGER,
  ativo BOOLEAN DEFAULT TRUE,
  internacional BOOLEAN DEFAULT FALSE,
  localizacao TEXT,
  data_inicio DATE,
  data_fim DATE,
  qtd_modulos INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. Garantir existência da tabela public.turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID REFERENCES public.cursos(id) NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'expedito',
  ano INTEGER NOT NULL,
  periodo periodo_enum NOT NULL,
  capacidade_max INTEGER DEFAULT 40,
  alunos_matriculados INTEGER DEFAULT 0,
  status turma_status_enum DEFAULT 'ativa',
  ativa BOOLEAN DEFAULT TRUE,
  data_inicio DATE,
  data_fim DATE,
  internacional BOOLEAN DEFAULT FALSE,
  localizacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Garantir existência da tabela public.alunos com o NIF e turma_id para o acesso
CREATE TABLE IF NOT EXISTS public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  data_nascimento DATE,
  turma_id UUID REFERENCES public.turmas(id),
  matricula TEXT UNIQUE NOT NULL,
  nif TEXT,
  rg TEXT,
  om TEXT,
  posto_graduacao TEXT,
  ano_admissao INTEGER,
  telefone TEXT,
  whatsapp TEXT,
  genero TEXT DEFAULT 'masculino',
  foto_url TEXT,
  status TEXT DEFAULT 'ativo',
  nome_pai TEXT,
  nome_mae TEXT,
  titulo_eleitor TEXT,
  data_inicio_curso DATE,
  data_fim_curso DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. Criar índice no NIF para acelerar e otimizar buscas de login por NIF
CREATE INDEX IF NOT EXISTS idx_alunos_nif ON public.alunos(nif);
CREATE INDEX IF NOT EXISTS idx_alunos_turma_id ON public.alunos(turma_id);

-- 6. Garantir que as políticas de Segurança de Nível de Linha (RLS) permitam acesso legível
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

-- Evita erro de duplicação recriando as políticas apenas se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'alunos' AND policyname = 'Admins have full access'
    ) THEN
        CREATE POLICY "Admins have full access" ON public.alunos FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'turmas' AND policyname = 'Admins have full access'
    ) THEN
        CREATE POLICY "Admins have full access" ON public.turmas FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
