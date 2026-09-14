-- Explore English accounts and per-user progress. Run through Supabase migrations.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text check (nickname is null or char_length(nickname) between 1 and 60)
);

create table if not exists public.learning_records (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (state ->> 'schemaVersion' = '2'),
  updated_at timestamptz not null default now(),
  completed_scene_count integer not null default 0 check (completed_scene_count >= 0),
  challenge_count integer not null default 0 check (challenge_count >= 0),
  last_learning_at timestamptz
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists public.scene_requirements (
  scene_id text primary key,
  target_count integer not null check (target_count > 0)
);
insert into public.scene_requirements (scene_id, target_count) values
  ('kitchen-2', 15), ('airport-2', 15), ('living-room-1', 12),
  ('bathroom-1', 12), ('laundry-room-1', 12), ('supermarket-2', 10),
  ('cafe-1', 10), ('swimming-pool-1', 11), ('skin-care-1', 10),
  ('hotel-room-1', 14), ('underwater-1', 11), ('classroom-1', 10),
  ('train-station-1', 10)
on conflict (scene_id) do update set target_count = excluded.target_count;

alter table public.profiles enable row level security;
alter table public.learning_records enable row level security;
alter table public.admin_users enable row level security;
alter table public.scene_requirements enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.learning_records from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.scene_requirements from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.learning_records to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "learning_select_own" on public.learning_records;
create policy "learning_select_own" on public.learning_records for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
drop policy if exists "learning_insert_own" on public.learning_records;
create policy "learning_insert_own" on public.learning_records for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
drop policy if exists "learning_update_own" on public.learning_records;
create policy "learning_update_own" on public.learning_records for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'nickname'), 60), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.calculate_learning_metrics()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  latest_event_ms bigint;
begin
  new.updated_at := now();
  select count(*)::integer into new.completed_scene_count
    from jsonb_each(coalesce(new.state -> 'scenes', '{}'::jsonb)) entry
    join public.scene_requirements requirement on requirement.scene_id = entry.key
    where jsonb_typeof(entry.value -> 'explored') = 'array'
      and jsonb_array_length(entry.value -> 'explored') >= requirement.target_count;
  select count(*)::integer into new.challenge_count
    from jsonb_object_keys(coalesce(new.state -> 'attempts', '{}'::jsonb));
  select max((event #>> '{}')::numeric)::bigint into latest_event_ms from (
    select jsonb_path_query(new.state, '$.scenes.*.lastVisited') as event
    union all select jsonb_path_query(new.state, '$.attempts.*.createdAt')
    union all select jsonb_path_query(new.state, '$.attempts.*.completedAt')
    union all select jsonb_path_query(new.state, '$.attempts.*.questions[*].revealedAt')
    union all select jsonb_path_query(new.state, '$.attempts.*.questions[*].answers[*].at')
  ) events where jsonb_typeof(event) = 'number';
  new.last_learning_at := case when latest_event_ms is null or latest_event_ms <= 0 then null
    else to_timestamp(latest_event_ms / 1000.0) end;
  return new;
end;
$$;
revoke all on function public.calculate_learning_metrics() from public, anon, authenticated;
drop trigger if exists learning_metrics_before_write on public.learning_records;
create trigger learning_metrics_before_write before insert or update on public.learning_records
for each row execute procedure public.calculate_learning_metrics();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- The Edge Function uses its server-only secret to read these tables. No browser role
-- receives access to admin_users or to another user's profile/progress row.
