-- Migração 56: Adiciona a coluna curso_id na tabela de alunos para atribuição individual de cursos
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS curso_id UUID REFERENCES cursos(id) ON DELETE SET NULL;
