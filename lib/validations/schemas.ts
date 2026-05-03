import { z } from 'zod';

export const cursoSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional().nullable(),
  ano_inicio: z.number().int().min(1900).max(2100),
  ativo: z.boolean(),
  internacional: z.boolean(),
  localizacao: z.string().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
});

export const turmaSchema = z.object({
  curso_id: z.string().uuid(),
  nome: z.string().min(1, "Nome é obrigatório"),
  ano: z.number().int().min(2020),
  periodo: z.enum(['manhã', 'tarde', 'noite']),
  capacidade_max: z.number().int().min(1).max(100),
  ativa: z.boolean(),
});

export const alunoSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email("E-mail inválido"),
  data_nascimento: z.string().optional().nullable(),
  turma_id: z.string().uuid().optional().nullable(),
  matricula: z.string().min(5),
  status: z.enum(['ativo', 'inativo', 'transferido']),
});

export const disciplinaSchema = z.object({
  nome: z.string().min(2),
  codigo: z.string().min(2),
  carga_horaria: z.number().int().min(10),
  curso_id: z.string().uuid(),
});

export const notaSchema = z.object({
  aluno_id: z.string().uuid(),
  disciplina_id: z.string().uuid(),
  turma_id: z.string().uuid(),
  nota1: z.number().min(0).max(10).optional().nullable(),
  nota2: z.number().min(0).max(10).optional().nullable(),
  frequencia: z.number().min(0).max(100),
  ano_letivo: z.number().int(),
});
