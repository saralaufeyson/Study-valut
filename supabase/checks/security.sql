select jsonb_build_object(
  'tables', (select jsonb_agg(jsonb_build_object(
    'name', c.relname, 'rls', c.relrowsecurity,
    'authenticated_select', has_table_privilege('authenticated', c.oid, 'SELECT'),
    'authenticated_insert', has_table_privilege('authenticated', c.oid, 'INSERT'),
    'authenticated_update', has_table_privilege('authenticated', c.oid, 'UPDATE'),
    'authenticated_delete', has_table_privilege('authenticated', c.oid, 'DELETE'),
    'anonymous_select', has_table_privilege('anon', c.oid, 'SELECT'),
    'owner_read_policy', exists(select 1 from pg_catalog.pg_policy p where p.polrelid = c.oid and p.polcmd = 'r' and pg_get_expr(p.polqual, p.polrelid) like '%uid()%user_id%')
  ) order by c.relname)
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('subjects','topics','lessons','study_mutation_receipts')),
  'rpc_authenticated', has_function_privilege('authenticated', 'public.apply_study_change(text,uuid,integer,jsonb,uuid)', 'EXECUTE'),
  'rpc_anonymous', has_function_privilege('anon', 'public.apply_study_change(text,uuid,integer,jsonb,uuid)', 'EXECUTE'),
  'rpc_security_definer', (select prosecdef from pg_catalog.pg_proc where oid = 'public.apply_study_change(text,uuid,integer,jsonb,uuid)'::regprocedure)
) as studyvault_security;
