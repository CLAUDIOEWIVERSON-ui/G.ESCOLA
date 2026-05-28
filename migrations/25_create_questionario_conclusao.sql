-- Migração para criar a tabela de questionários pós-conclusão de curso
-- Armazena as avaliações dos alunos sobre o curso, instrutor, autoavaliação, infraestrutura e sugestões em aberto.

CREATE TABLE IF NOT EXISTS public.questionarios_conclusao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE NOT NULL,
  curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE NOT NULL,
  instrutor_nome TEXT,
  
  -- Avaliação do Curso (escala de 1 a 5, onde 1 = Insatisfatório, 5 = Excelente)
  curso_q1 INTEGER CHECK (curso_q1 BETWEEN 1 AND 5), -- Conteúdo atendeu expectativas
  curso_q2 INTEGER CHECK (curso_q2 BETWEEN 1 AND 5), -- Material didático adequado
  curso_q3 INTEGER CHECK (curso_q3 BETWEEN 1 AND 5), -- Carga horária suficiente
  curso_q4 INTEGER CHECK (curso_q4 BETWEEN 1 AND 5), -- Exercícios práticos contribuíram
  curso_q5 INTEGER CHECK (curso_q5 BETWEEN 1 AND 5), -- Organização satisfatória
  curso_q6 INTEGER CHECK (curso_q6 BETWEEN 1 AND 5), -- Aplicabilidade profissional
  
  -- Avaliação do Instrutor (escala de 1 a 5)
  instrutor_q1 INTEGER CHECK (instrutor_q1 BETWEEN 1 AND 5), -- Domínio do conteúdo
  instrutor_q2 INTEGER CHECK (instrutor_q2 BETWEEN 1 AND 5), -- Clareza na explicação
  instrutor_q3 INTEGER CHECK (instrutor_q3 BETWEEN 1 AND 5), -- Pontualidade
  instrutor_q4 INTEGER CHECK (instrutor_q4 BETWEEN 1 AND 5), -- Didática
  instrutor_q5 INTEGER CHECK (instrutor_q5 BETWEEN 1 AND 5), -- Relacionamento com a turma
  instrutor_q6 INTEGER CHECK (instrutor_q6 BETWEEN 1 AND 5), -- Capacidade de solucionar dúvidas
  instrutor_q7 INTEGER CHECK (instrutor_q7 BETWEEN 1 AND 5), -- Condução das atividades práticas
  
  -- Autoavaliação do Aluno (escala de 1 a 5)
  auto_q1 INTEGER CHECK (auto_q1 BETWEEN 1 AND 5), -- Participação nas aulas
  auto_q2 INTEGER CHECK (auto_q2 BETWEEN 1 AND 5), -- Interesse demonstrado
  auto_q3 INTEGER CHECK (auto_q3 BETWEEN 1 AND 5), -- Frequência
  auto_q4 INTEGER CHECK (auto_q4 BETWEEN 1 AND 5), -- Aproveitamento do conteúdo
  auto_q5 INTEGER CHECK (auto_q5 BETWEEN 1 AND 5), -- Dedicação aos exercícios e avaliações
  
  -- Infraestrutura (escala de 1 a 5)
  infra_q1 INTEGER CHECK (infra_q1 BETWEEN 1 AND 5), -- Sala de aula
  infra_q2 INTEGER CHECK (infra_q2 BETWEEN 1 AND 5), -- Equipamentos
  infra_q3 INTEGER CHECK (infra_q3 BETWEEN 1 AND 5), -- Recursos audiovisuais
  infra_q4 INTEGER CHECK (infra_q4 BETWEEN 1 AND 5), -- Organização administrativa
  infra_q5 INTEGER CHECK (infra_q5 BETWEEN 1 AND 5), -- Ambiente de ensino
  
  -- Sugestões e Comentários Abertos
  sugestoes_melhoria TEXT,
  criticas_construtivas TEXT,
  elogios TEXT,
  necessidades_novos_cursos TEXT,
  comentarios_adicionais TEXT,
  
  -- Assinatura Digital e Auditoria
  assinatura_digital TEXT, -- Ex: "Assinado digitalmente por [Nome] em [Timestamp]"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicidade: um aluno só pode enviar uma avaliação por curso/turma
  UNIQUE (aluno_id, turma_id)
);

-- Habilitar Segurança de Nível de Linha (RLS)
ALTER TABLE public.questionarios_conclusao ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas de acessibilidade para alunos e administradores
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'questionarios_conclusao' AND policyname = 'Admins have full access'
    ) THEN
        CREATE POLICY "Admins have full access" ON public.questionarios_conclusao FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'questionarios_conclusao' AND policyname = 'Students can insert their own response'
    ) THEN
        CREATE POLICY "Students can insert their own response" ON public.questionarios_conclusao FOR INSERT WITH CHECK (
            auth.role() = 'authenticated'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'questionarios_conclusao' AND policyname = 'Students can view their own response'
    ) THEN
        CREATE POLICY "Students can view their own response" ON public.questionarios_conclusao FOR SELECT USING (
            auth.role() = 'authenticated'
        );
    END IF;
END $$;
