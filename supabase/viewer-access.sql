-- =====================================================================
-- Squarefour Developments — viewer (read-only) access
-- Run this once in Supabase Dashboard > SQL Editor > New query > Run,
-- after schema.sql. Safe to re-run.
--
-- Roles:
--   editor  — full access. Every email/password user is an editor; an
--             anonymous user becomes one by tapping Login on the home page.
--   viewer  — read-only. Joins by opening a share link (/view/<token>)
--             created in Settings > Viewer Access. Revoking the link
--             cuts off everyone who joined through it.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists viewer_links (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  label text not null default '',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','viewer')),
  viewer_link text references viewer_links(token) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Role checks (security definer so policies can read user_roles)
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
    join viewer_links l on l.token = r.viewer_link
    where r.user_id = auth.uid() and r.role = 'viewer' and l.revoked_at is null
  );
$$;

-- Called right after the home-page Login button signs in anonymously.
-- Never downgrades/upgrades an existing role (a viewer stays a viewer).
create or replace function claim_editor() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into user_roles (user_id, role) values (auth.uid(), 'editor')
  on conflict (user_id) do nothing;
end;
$$;

-- Called by the /view/<token> page. Returns false for a bad/revoked link.
create or replace function claim_viewer(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from viewer_links where token = p_token and revoked_at is null) then
    return false;
  end if;
  insert into user_roles (user_id, role, viewer_link) values (auth.uid(), 'viewer', p_token)
  on conflict (user_id) do update set viewer_link = excluded.viewer_link
    where user_roles.role = 'viewer';
  return true;
end;
$$;

-- Whoever was already signed in through the Login button before this ran
-- keeps full access.
insert into user_roles (user_id, role)
select id, 'editor' from auth.users where is_anonymous
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- Row Level Security — viewers read, editors write
-- ---------------------------------------------------------------------

alter table viewer_links enable row level security;
alter table user_roles enable row level security;

drop policy if exists "editors manage links" on viewer_links;
create policy "editors manage links" on viewer_links for all
  using (is_editor()) with check (is_editor());

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
