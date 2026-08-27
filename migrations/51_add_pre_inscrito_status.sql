-- Migration 51: Adiciona 'pré-inscrito' ao enum turma_status_enum para uso nas turmas
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. Garante a criação ou adição do valor 'pré-inscrito' no enum turma_status_enum
DO $$
BEGIN
    -- Se o enum não existir, cria com os valores necessários
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'turma_status_enum') THEN
        CREATE TYPE turma_status_enum AS ENUM ('ativa', 'concluída', 'cancelada', 'pré-inscrito');
    ELSE
        -- Se o enum já existir, adiciona o valor 'pré-inscrito' caso ainda não conste
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid 
            WHERE t.typname = 'turma_status_enum' AND e.enumlabel = 'pré-inscrito'
        ) THEN
            ALTER TYPE turma_status_enum ADD VALUE IF NOT EXISTS 'pré-inscrito';
        END IF;
    END IF;
END $$;

-- 2. Garante que a coluna status exista na tabela turmas com o enum turma_status_enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'turmas'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'turmas' AND column_name = 'status'
        ) THEN
            ALTER TABLE public.turmas ADD COLUMN status turma_status_enum DEFAULT 'ativa';
        END IF;
    END IF;
END $$;
