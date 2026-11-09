select jsonb_build_object(
  'tables', coalesce((select jsonb_agg(c.relname order by c.relname)
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('subjects','topics','lessons','study_mutation_receipts')), '[]'::jsonb),
  'rpc_exists', to_regprocedure('public.apply_study_change(text,uuid,integer,jsonb,uuid)') is not null,
  'history_exists', to_regclass('supabase_migrations.schema_migrations') is not null,
  'server_version', current_setting('server_version_num')
) as studyvault_preflight;
