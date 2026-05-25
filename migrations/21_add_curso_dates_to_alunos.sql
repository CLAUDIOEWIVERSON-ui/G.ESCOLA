-- Migration to add individual course start and end dates to alunos
ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS data_inicio_curso DATE,
ADD COLUMN IF NOT EXISTS data_fim_curso DATE;
