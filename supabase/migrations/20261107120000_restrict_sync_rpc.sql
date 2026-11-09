-- Supabase can grant function execution directly to anon through default
-- privileges. Revoking PUBLIC alone does not remove that direct role grant.
-- This only changes permissions; it does not change learning records.
revoke all on function public.apply_study_change(text,uuid,integer,jsonb,uuid) from public, anon;
grant execute on function public.apply_study_change(text,uuid,integer,jsonb,uuid) to authenticated;
