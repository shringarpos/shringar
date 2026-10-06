CREATE OR REPLACE FUNCTION public.get_identities_columns()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_agg(json_build_object('col', column_name, 'type', data_type))
  FROM information_schema.columns
  WHERE table_schema = 'auth' AND table_name = 'identities';
$$;
GRANT EXECUTE ON FUNCTION public.get_identities_columns() TO anon, authenticated, service_role;
