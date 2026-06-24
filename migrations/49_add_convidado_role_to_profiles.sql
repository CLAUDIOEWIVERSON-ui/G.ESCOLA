-- Migração 49: Adiciona a role 'convidado' ao tipo enum user_role_enum no banco de dados.
DO $$
BEGIN
    -- Add 'convidado' to user_role_enum if it's missing
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'convidado'
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'convidado';
    END IF;
END
$$;
