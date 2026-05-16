-- Initial Database Schema for Escola Digital
-- This includes all tables, enums, functions, and initial configuration

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE periodo_enum AS ENUM ('manhã', 'tarde', 'noite');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE aluno_status_enum AS ENUM ('ativo', 'inativo', 'transferido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'instrutor', 'aluno');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles (to store user roles linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL DEFAULT 'aluno',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  ano_inicio INTEGER,
  ativo BOOLEAN DEFAULT TRUE,
  internacional BOOLEAN DEFAULT FALSE,
  localizacao TEXT,
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID REFERENCES public.cursos(id) NOT NULL,
  nome TEXT NOT NULL,
  ano INTEGER NOT NULL,
  periodo periodo_enum NOT NULL,
  capacidade_max INTEGER DEFAULT 40,
  alunos_matriculados INTEGER DEFAULT 0,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. Alunos
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
  foto_url TEXT,
  status aluno_status_enum DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. Disciplinas
CREATE TABLE IF NOT EXISTS public.disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  carga_horaria INTEGER,
  curso_id UUID REFERENCES public.cursos(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 7. Notas
CREATE TABLE IF NOT EXISTS public.notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) NOT NULL,
  disciplina_id UUID REFERENCES public.disciplinas(id) NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) NOT NULL,
  nota1 NUMERIC(3,1) CHECK (nota1 >= 0 AND nota1 <= 10),
  nota2 NUMERIC(3,1) CHECK (nota2 >= 0 AND nota2 <= 10),
  nota_final NUMERIC(3,1),
  frequencia NUMERIC(4,1) CHECK (frequencia >= 0 AND frequencia <= 100),
  ano_letivo INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Functions & Triggers
-- ... (rest of functions from schema)

-- 9. RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

-- Simple policies (Admins can do everything)
-- ... (rest of policies from schema)
