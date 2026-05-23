# Escola Digital - SQL Schema

-- 1. Enums
CREATE TYPE periodo_enum AS ENUM ('manhã', 'tarde', 'noite');
CREATE TYPE turma_status_enum AS ENUM ('ativa', 'concluída', 'cancelada');
CREATE TYPE aluno_status_enum AS ENUM ('ativo', 'inativo', 'transferido');
CREATE TYPE user_role_enum AS ENUM ('admin', 'instrutor', 'aluno');

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

-- 4. Turmas
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
  genero TEXT DEFAULT 'masculino',
  foto_url TEXT,
  status TEXT DEFAULT 'ativo',
  nome_pai TEXT,
  nome_mae TEXT,
  titulo_eleitor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. Certificados
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id),
  turma_id UUID REFERENCES public.turmas(id),
  curso_id UUID REFERENCES public.cursos(id),
  tipo TEXT CHECK (tipo IN ('certificado', 'diploma')),
  template_data JSONB DEFAULT '{}'::jsonb,
  url TEXT,
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 7. Disciplinas
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
  nota1 NUMERIC CHECK (nota1 >= 0),
  nota2 NUMERIC CHECK (nota2 >= 0),
  nota3 NUMERIC CHECK (nota3 >= 0),
  nota4 NUMERIC CHECK (nota4 >= 0),
  nota5 NUMERIC CHECK (nota5 >= 0),
  nota_final NUMERIC,
  frequencia NUMERIC(4,1) CHECK (frequencia >= 0 AND frequencia <= 100),
  pago BOOLEAN DEFAULT FALSE,
  ano_letivo INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aluno_id, disciplina_id, turma_id)
);

-- 8. Functions & Triggers

-- Auto calculate nota_final
CREATE OR REPLACE FUNCTION calculate_nota_final()
RETURNS TRIGGER AS $$
DECLARE
  total NUMERIC := 0;
  count INTEGER := 0;
BEGIN
  IF NEW.nota1 IS NOT NULL THEN
    total := total + NEW.nota1;
    count := count + 1;
  END IF;
  IF NEW.nota2 IS NOT NULL THEN
    total := total + NEW.nota2;
    count := count + 1;
  END IF;
  IF NEW.nota3 IS NOT NULL THEN
    total := total + NEW.nota3;
    count := count + 1;
  END IF;
  IF NEW.nota4 IS NOT NULL THEN
    total := total + NEW.nota4;
    count := count + 1;
  END IF;
  IF NEW.nota5 IS NOT NULL THEN
    total := total + NEW.nota5;
    count := count + 1;
  END IF;

  IF count > 0 THEN
    NEW.nota_final := total / count;
  ELSE
    NEW.nota_final := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_nota_final
BEFORE INSERT OR UPDATE ON public.notas
FOR EACH ROW
EXECUTE FUNCTION calculate_nota_final();

-- Update alunos_matriculados in turmas
CREATE OR REPLACE FUNCTION update_turma_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.turmas SET alunos_matriculados = alunos_matriculados + 1 WHERE id = NEW.turma_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.turmas SET alunos_matriculados = alunos_matriculados - 1 WHERE id = OLD.turma_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.turma_id IS DISTINCT FROM NEW.turma_id THEN
      IF OLD.turma_id IS NOT NULL THEN
        UPDATE public.turmas SET alunos_matriculados = alunos_matriculados - 1 WHERE id = OLD.turma_id;
      END IF;
      IF NEW.turma_id IS NOT NULL THEN
        UPDATE public.turmas SET alunos_matriculados = alunos_matriculados + 1 WHERE id = NEW.turma_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_turma_count
AFTER INSERT OR UPDATE OR DELETE ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION update_turma_count();

-- 9. RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

-- Simple policies (Admins can do everything)
-- In a real scenario, you'd check roles in JWT claims or join with profiles table
CREATE POLICY "Admins have full access" ON public.cursos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access" ON public.turmas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access" ON public.alunos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access" ON public.disciplinas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access" ON public.notas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access" ON public.certificados FOR ALL USING (auth.role() = 'authenticated');

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 10. Frequência
CREATE TABLE IF NOT EXISTS public.frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) NOT NULL,
  disciplina_id UUID REFERENCES public.disciplinas(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  presente BOOLEAN DEFAULT TRUE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aluno_id, turma_id, disciplina_id, data)
);

-- 11. Configurações da Escola
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_aprovacao DECIMAL(4,2) DEFAULT 7.0,
  media_recuperacao DECIMAL(4,2) DEFAULT 5.0,
  nota_maxima DECIMAL(4,2) DEFAULT 10.0,
  frequencia_minima INTEGER DEFAULT 75,
  ano_letivo_atual INTEGER DEFAULT 2024,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração inicial se não existir
INSERT INTO public.configuracoes (media_aprovacao, media_recuperacao, nota_maxima, frequencia_minima, ano_letivo_atual)
SELECT 7.0, 5.0, 10.0, 75, 2024
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes);

CREATE INDEX idx_frequencia_turma_data ON public.frequencia(turma_id, data);

ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.frequencia FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.configuracoes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read access" ON public.configuracoes FOR SELECT USING (true);

-- 12. Eventos
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data TIMESTAMPTZ NOT NULL,
  cor TEXT DEFAULT 'bg-blue-600',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 13. Widgets
CREATE TABLE IF NOT EXISTS public.widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own widgets" ON public.widgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all widgets" ON public.widgets FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Admins have full access" ON public.eventos FOR ALL USING (auth.role() = 'authenticated');

-- 14. Horários
CREATE TABLE IF NOT EXISTS public.horarios (
  turma_id UUID PRIMARY KEY REFERENCES public.turmas(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.horarios FOR SELECT USING (true);
CREATE POLICY "Admins have full access" ON public.horarios FOR ALL USING (auth.role() = 'authenticated');
