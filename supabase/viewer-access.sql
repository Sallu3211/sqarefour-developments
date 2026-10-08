-- =====================================================================
-- Squarefour Developments — PIN login: owner (editor) + viewer (read-only)
-- Run this once in Supabase Dashboard > SQL Editor > New query > Run,
-- after schema.sql. Safe to re-run.
--
-- Home page has two buttons:
--   Login         — full access. Asks for the owner PIN if one is set
--                   (Settings > Login PINs); with no owner PIN it opens
--                   straight away.
--   Viewer Login  — read-only. Always asks for the viewer PIN. Changing
--                   or turning off the viewer PIN signs out every viewer.
-- Email/password users (if any) are always editors.
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- Clean up the earlier share-link version, if it was ever run.
drop function if exists claim_viewer(text);
drop function if exists claim_editor();
alter table if exists user_roles drop column if exists viewer_link;
drop table if exists viewer_links cascade;

create table if not exists access_pins (
  role text primary key check (role in ('editor','viewer')),
  pin_hash text not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','viewer')),
  pin_version int not null default 0,
  created_at timestamptz not null default now()
);
alter table user_roles add column if not exists pin_version int not null default 0;

create table if not exists pin_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists pin_attempts_user_idx on pin_attempts (user_id, at);

-- ---------------------------------------------------------------------
-- Role checks (security definer so policies can read the role tables)
-- ---------------------------------------------------------------------

create or replace function is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.role() = 'authenticated' and (
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    or exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor')
  );
$$;

create or replace function can_view() returns boolean
language sql stable security definer set search_path = public as $$
  select is_editor() or exists (
    select 1
    from user_roles r
    join access_pins p on p.role = 'viewer' and p.version = r.pin_version
    where r.user_id = auth.uid() and r.role = 'viewer'
  );
$$;

-- What the current user may do: 'editor', 'viewer' or null (no access).
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select case when is_editor() then 'editor' when can_view() then 'viewer' else null end;
$$;

-- Which PINs are set. Callable before sign-in so the home page knows
-- whether to ask for a PIN.
create or replace function pin_status() returns table (editor_pin boolean, viewer_pin boolean)
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from access_pins where role = 'editor'),
    exists (select 1 from access_pins where role = 'viewer');
$$;

-- Returns 'ok', 'wrong', 'locked' (5 wrong tries in 10 min) or 'not_set'.
create or replace function login_with_pin(p_role text, p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  rec access_pins%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_role not in ('editor','viewer') then
    raise exception 'bad role';
  end if;

  select * into rec from access_pins where role = p_role;

  if not found then
    if p_role = 'viewer' then
      return 'not_set';
    end if;
    -- No owner PIN set: Login opens without one.
  else
    if (select count(*) from pin_attempts
        where user_id = auth.uid() and at > now() - interval '10 minutes') >= 5 then
      return 'locked';
    end if;
    if p_pin is null or crypt(p_pin, rec.pin_hash) <> rec.pin_hash then
      insert into pin_attempts (user_id) values (auth.uid());
      return 'wrong';
    end if;
  end if;

  delete from pin_attempts where user_id = auth.uid();
  insert into user_roles (user_id, role, pin_version)
  values (auth.uid(), p_role, coalesce(rec.version, 0))
  on conflict (user_id) do update
    set role = case when user_roles.role = 'editor' then 'editor' else excluded.role end,
        pin_version = excluded.pin_version;
  return 'ok';
end;
$$;

-- Owner only. p_pin null removes the PIN (owner: Login opens without a
-- PIN; viewer: Viewer Login is turned off). Any change to the viewer PIN
-- signs out every current viewer.
create or replace function set_pin(p_role text, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_editor() then
    raise exception 'only the owner can change PINs';
  end if;
  if p_role not in ('editor','viewer') then
    raise exception 'bad role';
  end if;
  if p_pin is null then
    delete from access_pins where role = p_role;
    return;
  end if;
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;
  insert into access_pins (role, pin_hash, version)
  values (p_role, crypt(p_pin, gen_salt('bf')),
          coalesce((select max(pin_version) from user_roles where role = p_role), 0) + 1)
  on conflict (role) do update
    set pin_hash = excluded.pin_hash,
        version = access_pins.version + 1,
        updated_at = now();
end;
$$;

grant execute on function pin_status() to anon, authenticated;
grant execute on function my_role(), login_with_pin(text, text), set_pin(text, text) to authenticated;

-- Whoever already signed in with the open Login button keeps full access.
insert into user_roles (user_id, role)
select id, 'editor' from auth.users where is_anonymous
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- Row Level Security — viewers read, editors write
-- ---------------------------------------------------------------------

alter table access_pins enable row level security;   -- no policies: functions only
alter table pin_attempts enable row level security;  -- no policies: functions only
alter table user_roles enable row level security;

drop policy if exists "read own role" on user_roles;
create policy "read own role" on user_roles for select
  using (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array['sites','categories','workers','entries','bills','drafts','app_settings'] loop
    execute format('drop policy if exists "authenticated full access" on %I', t);
    execute format('drop policy if exists "viewers read" on %I', t);
    execute format('drop policy if exists "editors insert" on %I', t);
    execute format('drop policy if exists "editors update" on %I', t);
    execute format('drop policy if exists "editors delete" on %I', t);
    execute format('create policy "viewers read" on %I for select using (can_view())', t);
    execute format('create policy "editors insert" on %I for insert with check (is_editor())', t);
    execute format('create policy "editors update" on %I for update using (is_editor()) with check (is_editor())', t);
    execute format('create policy "editors delete" on %I for delete using (is_editor())', t);
  end loop;
end $$;

drop policy if exists "authenticated manage receipts" on storage.objects;
create policy "authenticated manage receipts" on storage.objects for all
  using (bucket_id = 'receipts' and is_editor())
  with check (bucket_id = 'receipts' and is_editor());

drop policy if exists "authenticated manage branding" on storage.objects;
create policy "authenticated manage branding" on storage.objects for all
  using (bucket_id = 'branding' and is_editor())
  with check (bucket_id = 'branding' and is_editor());
