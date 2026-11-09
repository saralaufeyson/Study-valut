-- Run once in the Supabase SQL editor. All client writes go through the revision-checked RPC.
create table public.subjects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '' check (length(description) <= 1000),
  color text not null default 'sage' check (color in ('sage','sand','blue','rose','violet')),
  icon text not null default 'book' check (length(icon) <= 30),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);
create table public.topics (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  position double precision not null default 0 check (position >= 0 and position < 1000000000),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects(id, user_id)
);
create table public.lessons (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 200),
  url text not null check (length(url) <= 2000),
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  position double precision not null default 0 check (position >= 0 and position < 1000000000),
  completed boolean not null default false,
  notes text not null default '' check (length(notes) <= 20000),
  last_opened_at timestamptz,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (topic_id, user_id) references public.topics(id, user_id)
);
create index subjects_owner on public.subjects(user_id);
create index topics_owner_parent on public.topics(user_id, subject_id);
create index lessons_owner_parent on public.lessons(user_id, topic_id);

-- Receipts make retrying a request after a network interruption idempotent.
create table public.study_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.study_mutation_receipts enable row level security;
create policy subjects_own_read on public.subjects for select to authenticated using ((select auth.uid()) = user_id);
create policy topics_own_read on public.topics for select to authenticated using ((select auth.uid()) = user_id);
create policy lessons_own_read on public.lessons for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.subjects, public.topics, public.lessons, public.study_mutation_receipts from anon, authenticated;
grant select on public.subjects, public.topics, public.lessons to authenticated;

create or replace function public.apply_study_change(
  p_table text, p_id uuid, p_expected_revision integer, p_patch jsonb, p_mutation_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  old_row jsonb;
  new_row jsonb;
  receipt jsonb;
  result jsonb;
  allowed text[];
  patch_key text;
  columns_sql text;
  parent_exists boolean;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_table not in ('subjects','topics','lessons') or p_table is null then raise exception 'Invalid table'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_expected_revision < 0 or p_expected_revision is null or p_mutation_id is null or p_id is null then raise exception 'Invalid change'; end if;
  -- One short transaction at a time per owner also serializes parent deletions with child edits.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  select r.result into receipt from public.study_mutation_receipts r where r.user_id = owner_id and r.mutation_id = p_mutation_id;
  if receipt is not null then return receipt; end if;
  allowed := case p_table
    when 'subjects' then array['name','description','color','icon','deleted_at']
    when 'topics' then array['subject_id','name','position','deleted_at']
    else array['topic_id','title','url','video_id','position','completed','notes','last_opened_at','deleted_at'] end;
  for patch_key in select jsonb_object_keys(p_patch) loop
    if not (patch_key = any(allowed)) then raise exception 'Invalid field: %', patch_key; end if;
  end loop;
  execute format('select to_jsonb(t) from public.%I t where id = $1 and user_id = $2', p_table) into old_row using p_id, owner_id;
  if coalesce((old_row->>'revision')::integer, 0) <> p_expected_revision then
    return jsonb_build_object('conflict', true, 'row', old_row, 'reason', 'revision');
  end if;
  new_row := coalesce(old_row, case p_table
    when 'subjects' then '{"description":"","color":"sage","icon":"book"}'::jsonb
    when 'topics' then '{"position":0}'::jsonb
    else '{"position":0,"completed":false,"notes":"","last_opened_at":null}'::jsonb end
    || '{"deleted_at":null}'::jsonb) || p_patch
    || jsonb_build_object('id', p_id, 'user_id', owner_id, 'revision', p_expected_revision + 1, 'updated_at', clock_timestamp());
  if p_table = 'topics' and new_row->>'deleted_at' is null then
    select exists(select 1 from public.subjects where id = (new_row->>'subject_id')::uuid and user_id = owner_id and deleted_at is null) into parent_exists;
    if not parent_exists then return jsonb_build_object('conflict',true,'row',old_row,'reason','parent_deleted'); end if;
  elsif p_table = 'lessons' and new_row->>'deleted_at' is null then
    select exists(select 1 from public.topics t join public.subjects s on s.id = t.subject_id and s.user_id = t.user_id where t.id = (new_row->>'topic_id')::uuid and t.user_id = owner_id and t.deleted_at is null and s.deleted_at is null) into parent_exists;
    if not parent_exists then return jsonb_build_object('conflict',true,'row',old_row,'reason','parent_deleted'); end if;
  end if;
  if old_row is null then
    execute format('insert into public.%I select (jsonb_populate_record(null::public.%I, $1)).* returning to_jsonb(%I.*)', p_table, p_table, p_table) into new_row using new_row;
  else
    select string_agg(quote_ident(col), ',') into columns_sql from unnest(allowed || array['revision','updated_at']) as col;
    execute format('update public.%1$I as t set (%2$s) = (select %2$s from jsonb_populate_record(null::public.%1$I, $1)) where id = $2 and user_id = $3 returning to_jsonb(t)', p_table, columns_sql)
      into new_row using new_row, p_id, owner_id;
  end if;
  result := jsonb_build_object('conflict',false,'row',new_row);
  insert into public.study_mutation_receipts(user_id, mutation_id, result) values (owner_id, p_mutation_id, result);
  return result;
end;
$$;
revoke all on function public.apply_study_change(text,uuid,integer,jsonb,uuid) from public;
grant execute on function public.apply_study_change(text,uuid,integer,jsonb,uuid) to authenticated;
