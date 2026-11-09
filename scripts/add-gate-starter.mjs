import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { cli, findValue, root, target } from './lib/supabase-cloud.mjs'

// Administrator convenience for this personal project. Multi-user projects must
// use the account-scoped Settings action instead of guessing an account.
const pack = JSON.parse(
  readFileSync(path.join(root, 'src/data/gate-2027-cs.json'), 'utf8'),
)
const apply = process.argv.includes('--apply')
const quote = (value) => "'" + value.replaceAll("'", "''") + "'"
const sql = `
begin;
do $owner$
declare account_id uuid; account_count integer;
begin
  select count(*), min(id::text)::uuid into account_count, account_id
    from auth.users where email_confirmed_at is not null and last_sign_in_at is not null;
  if account_count <> 1 then
    raise exception 'Starter setup requires exactly one confirmed, signed-in account. Use Settings in the app to choose your own account.';
  end if;
  perform set_config('studyvault.starter.owner', account_id::text, true);
end;
$owner$;
set local role authenticated;
do $starter$
declare
  owner_id uuid := current_setting('studyvault.starter.owner')::uuid;
  template jsonb; topic_name text; v_subject_id uuid; topic_position double precision;
  added_subjects integer := 0; added_topics integer := 0; result jsonb;
begin
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',owner_id,'role','authenticated')::text, true);
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  for template in select value from jsonb_array_elements(${quote(JSON.stringify(pack.subjects))}::jsonb) loop
    select s.id into v_subject_id from public.subjects s
      where s.user_id=owner_id and s.deleted_at is null
      and lower(regexp_replace(btrim(s.name),'[[:space:]]+',' ','g'))=lower(template->>'name')
      order by s.id limit 1;
    if v_subject_id is null then
      v_subject_id := gen_random_uuid();
      result := public.apply_study_change('subjects',v_subject_id,0,template - 'topics',gen_random_uuid());
      if (result->>'conflict')::boolean then raise exception 'Starter subject was not saved; transaction cancelled'; end if;
      added_subjects := added_subjects + 1;
    end if;
    select coalesce(max(position)+1,0) into topic_position from public.topics
      where user_id=owner_id and public.topics.subject_id=v_subject_id and deleted_at is null;
    for topic_name in select jsonb_array_elements_text(template->'topics') loop
      if exists(select 1 from public.topics t where t.user_id=owner_id and t.subject_id=v_subject_id
          and t.deleted_at is null and lower(regexp_replace(btrim(t.name),'[[:space:]]+',' ','g'))=lower(topic_name)) then continue; end if;
      result := public.apply_study_change('topics',gen_random_uuid(),0,
        jsonb_build_object('subject_id',v_subject_id,'name',topic_name,'position',topic_position),gen_random_uuid());
      if (result->>'conflict')::boolean then raise exception 'Starter topic was not saved; transaction cancelled'; end if;
      topic_position := topic_position + 1;
      added_topics := added_topics + 1;
    end loop;
  end loop;
  perform set_config('studyvault.starter.result',jsonb_build_object('subjects',added_subjects,'topics',added_topics)::text,true);
end;
$starter$;
select current_setting('studyvault.starter.result')::jsonb as starter_result;
${apply ? 'commit' : 'rollback'};
`

try {
  const folder = path.join(root, '.studyvault-setup/starter')
  mkdirSync(folder, { recursive: true })
  const file = path.join(folder, 'gate-2027-cs.sql')
  writeFileSync(file, sql)
  const response = cli(['db', 'query', target(), '--file', file, '--yes'])
  const result = findValue(response, 'starter_result')
  if (
    !result ||
    !Number.isInteger(result.subjects) ||
    !Number.isInteger(result.topics)
  )
    throw new Error(
      'The CLI did not return starter counts. Check the account library before retrying.',
    )
  console.log(
    `${apply ? 'Added' : 'Preview (rolled back)'}: ${result.subjects} subjects, ${result.topics} topics. Existing records and all lessons were preserved.`,
  )
  if (!apply)
    console.log('Run npm run starter:cloud:apply to save these additions.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
