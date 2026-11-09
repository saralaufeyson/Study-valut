-- Live integration check. All fixture users, records and receipts are rolled
-- back together. Existing user data is never changed and no emails are sent.
begin;
select set_config('studyvault.check.owner', gen_random_uuid()::text, true);
select set_config('studyvault.check.other', gen_random_uuid()::text, true);
insert into auth.users(id, email, aud, role) values
  (current_setting('studyvault.check.owner')::uuid, 'studyvault-check-' || current_setting('studyvault.check.owner') || '@example.invalid', 'authenticated', 'authenticated'),
  (current_setting('studyvault.check.other')::uuid, 'studyvault-check-' || current_setting('studyvault.check.other') || '@example.invalid', 'authenticated', 'authenticated');
set local role authenticated;
do $$
declare
  owner_id uuid := current_setting('studyvault.check.owner')::uuid;
  other_id uuid := current_setting('studyvault.check.other')::uuid;
  s uuid := gen_random_uuid(); t uuid := gen_random_uuid();
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  mutation uuid := gen_random_uuid(); result jsonb; first_result jsonb;
  completed_count integer; total_count integer; ordered_ids uuid[];
begin
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',owner_id,'role','authenticated')::text, true);
  result := public.apply_study_change('subjects',s,0,'{"name":"StudyVault integration check","color":"sage","icon":"book"}',gen_random_uuid());
  if (result->>'conflict')::boolean then raise exception 'Subject create failed'; end if;
  result := public.apply_study_change('topics',t,0,jsonb_build_object('subject_id',s,'name','Topic','position',0),gen_random_uuid());
  if (result->>'conflict')::boolean then raise exception 'Topic create failed'; end if;
  result := public.apply_study_change('lessons',a,0,jsonb_build_object('topic_id',t,'title','Lesson A','position',0,'url','https://youtu.be/fNk_zzaMoSs','video_id','fNk_zzaMoSs','notes','Original note'),gen_random_uuid());
  if (result->>'conflict')::boolean then raise exception 'Lesson create failed'; end if;
  perform public.apply_study_change('lessons',b,0,jsonb_build_object('topic_id',t,'title','Lesson B','position',1,'url','https://youtu.be/k7RM-ot2NWY','video_id','k7RM-ot2NWY'),gen_random_uuid());
  first_result := public.apply_study_change('lessons',a,1,'{"completed":true}',mutation);
  result := public.apply_study_change('lessons',a,1,'{"completed":true}',mutation);
  if first_result <> result or (result->'row'->>'revision')::integer <> 2 then raise exception 'Idempotent retry failed'; end if;
  select count(*) filter(where completed), count(*) into completed_count,total_count from public.lessons where topic_id=t and deleted_at is null;
  if completed_count <> 1 or total_count <> 2 then raise exception 'Topic progress failed'; end if;
  select count(*) filter(where l.completed),count(*) into completed_count,total_count from public.lessons l join public.topics q on q.id=l.topic_id where q.subject_id=s and l.deleted_at is null and q.deleted_at is null;
  if completed_count <> 1 or total_count <> 2 then raise exception 'Subject progress failed'; end if;
  perform public.apply_study_change('lessons',a,2,'{"position":1}',gen_random_uuid());
  perform public.apply_study_change('lessons',b,1,'{"position":0}',gen_random_uuid());
  select array_agg(id order by position) into ordered_ids from public.lessons where topic_id=t;
  if ordered_ids <> array[b,a] then raise exception 'Lesson ordering failed'; end if;
  perform public.apply_study_change('lessons',a,3,'{"notes":"Saved across devices"}',gen_random_uuid());
  result := public.apply_study_change('lessons',a,2,'{"notes":"Stale offline edit"}',gen_random_uuid());
  if not (result->>'conflict')::boolean or result->'row'->>'notes' <> 'Saved across devices' then raise exception 'Cross-device conflict protection failed'; end if;
  perform public.apply_study_change('subjects',s,1,'{"name":"Edited subject"}',gen_random_uuid());
  perform public.apply_study_change('topics',t,1,'{"name":"Edited topic"}',gen_random_uuid());
  if not exists(select 1 from public.subjects where id=s and name='Edited subject') then raise exception 'Subject edit/read failed'; end if;
  if not exists(select 1 from public.topics where id=t and name='Edited topic') then raise exception 'Topic edit/read failed'; end if;
  begin
    update public.subjects set name='Bypass' where id=s;
    raise exception 'Direct writes incorrectly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.study_mutation_receipts;
    raise exception 'Private receipts incorrectly readable';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated')::text,true);
  if exists(select 1 from public.subjects) or exists(select 1 from public.topics) or exists(select 1 from public.lessons) then raise exception 'Cross-user reads incorrectly allowed'; end if;
  result := public.apply_study_change('subjects',s,2,'{"name":"Other account"}',gen_random_uuid());
  if not (result->>'conflict')::boolean or result->'row' <> 'null'::jsonb then raise exception 'Cross-user write incorrectly allowed'; end if;
  result := public.apply_study_change('topics',gen_random_uuid(),0,jsonb_build_object('subject_id',s,'name','Other account topic'),gen_random_uuid());
  if result->>'reason' <> 'parent_deleted' then raise exception 'Parent ownership check failed'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  perform public.apply_study_change('lessons',a,4,jsonb_build_object('deleted_at',clock_timestamp()),gen_random_uuid());
  if not exists(select 1 from public.lessons where id=a and deleted_at is not null) then raise exception 'Lesson deletion failed'; end if;
  perform public.apply_study_change('topics',t,2,jsonb_build_object('deleted_at',clock_timestamp()),gen_random_uuid());
  result := public.apply_study_change('lessons',b,2,'{"completed":true}',gen_random_uuid());
  if result->>'reason' <> 'parent_deleted' then raise exception 'Deleted parent protection failed'; end if;
  perform public.apply_study_change('subjects',s,2,jsonb_build_object('deleted_at',clock_timestamp()),gen_random_uuid());
  if not exists(select 1 from public.subjects where id=s and deleted_at is not null) then raise exception 'Subject deletion failed'; end if;
end;
$$;
rollback;
