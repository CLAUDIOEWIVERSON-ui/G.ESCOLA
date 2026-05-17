-- Migration to fix user_role_enum by adding 'instrutor' if it doesn't exist
-- and ensuring it matches the application's expectations.

DO $$
BEGIN
    -- Add 'instrutor' to user_role_enum if it's missing
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'instrutor'
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'instrutor';
    END IF;
END
$$;

-- Migrate any old 'professor' roles to 'instrutor' if they exist in the database
-- This handles legacy data from before the rename to 'instrutor'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'UPDATE public.profiles SET role = ''instrutor'' WHERE role::text = ''professor''';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If 'professor' isn't even in the enum anymore or other errors, ignore
        NULL;
END
$$;
