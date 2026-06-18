-- 43. Função para obter informações em tempo real do tamanho e capacidade do banco de dados (Peso das tabelas vs Capacidade limite de 500MB)
CREATE OR REPLACE FUNCTION public.get_db_storage_stats()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  table_size_bytes BIGINT,
  total_db_size_bytes BIGINT,
  db_capacity_bytes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_db_size BIGINT;
  capacity_limit BIGINT := 524288000; -- 500 MB (Limite padrão do Supabase Free Tier)
BEGIN
  -- Obter o tamanho total do banco de dados atual
  SELECT pg_database_size(current_database()) INTO current_db_size;

  RETURN QUERY
  SELECT 
    t.schemaname || '.' || t.tablename AS table_name,
    COALESCE(c.reltuples::bigint, 0) AS row_count,
    pg_total_relation_size(c.oid)::bigint AS table_size_bytes,
    current_db_size AS total_db_size_bytes,
    capacity_limit AS db_capacity_bytes
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;
