-- =====================================================================
-- Squarefour Developments — Supabase schema
-- Run this once in Supabase Dashboard > SQL Editor > New query > Run.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING throughout.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('purchase','labour','other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, type)
);

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Labour',
  phone text,
  default_site_id uuid references sites(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  entry_date date not null default current_date,
  entry_date_end date,
  type text not null check (type in ('purchase','labour','other')),
  category_id uuid references categories(id) on delete set null,
  worker_id uuid references workers(id) on delete set null,
  description text not null default '',
  quantity numeric,
  unit_price numeric,
  amount numeric not null check (amount >= 0),
  photo_url text,
  status text not null default 'submitted' check (status in ('draft','submitted')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Added later for date-range labour/overtime entries — this line applies
-- to a database that already ran the schema before entry_date_end existed.
alter table entries add column if not exists entry_date_end date;

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  period_type text not null check (period_type in ('daily','weekly','monthly','yearly','custom')),
  period_start date not null,
  period_end date not null,
  total_amount numeric not null default 0,
  snapshot_json jsonb not null default '[]',
  pdf_url text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists drafts (
  id text primary key,
  form_type text not null,
  payload_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

create index if not exists entries_site_date_idx on entries (site_id, entry_date);
create index if not exists entries_worker_idx on entries (worker_id);
create index if not exists entries_type_idx on entries (type);
create index if not exists bills_site_idx on bills (site_id);

-- ---------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ---------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_set_updated_at on entries;
create trigger entries_set_updated_at before update on entries
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — single shared login, any authenticated user has
-- full access to every table (no per-site restriction).
-- ---------------------------------------------------------------------

alter table sites enable row level security;
alter table categories enable row level security;
alter table workers enable row level security;
alter table entries enable row level security;
alter table bills enable row level security;
alter table drafts enable row level security;
alter table app_settings enable row level security;

drop policy if exists "authenticated full access" on sites;
create policy "authenticated full access" on sites for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on categories;
create policy "authenticated full access" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on workers;
create policy "authenticated full access" on workers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on entries;
create policy "authenticated full access" on entries for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on bills;
create policy "authenticated full access" on bills for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on drafts;
create policy "authenticated full access" on drafts for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on app_settings;
create policy "authenticated full access" on app_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- Storage buckets: receipts (entry photos) and branding (logo)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "authenticated manage receipts" on storage.objects;
create policy "authenticated manage receipts" on storage.objects for all
  using (bucket_id = 'receipts' and auth.role() = 'authenticated')
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

drop policy if exists "public read receipts" on storage.objects;
create policy "public read receipts" on storage.objects for select
  using (bucket_id = 'receipts');

drop policy if exists "authenticated manage branding" on storage.objects;
create policy "authenticated manage branding" on storage.objects for all
  using (bucket_id = 'branding' and auth.role() = 'authenticated')
  with check (bucket_id = 'branding' and auth.role() = 'authenticated');

drop policy if exists "public read branding" on storage.objects;
create policy "public read branding" on storage.objects for select
  using (bucket_id = 'branding');

-- ---------------------------------------------------------------------
-- Seed categories — edit or add more anytime from Settings > Categories
-- ---------------------------------------------------------------------

insert into categories (name, type) values
  ('Cement', 'purchase'),
  ('Steel / Rebar', 'purchase'),
  ('Sand', 'purchase'),
  ('Bricks / Blocks', 'purchase'),
  ('Aggregate / Gravel', 'purchase'),
  ('Electrical', 'purchase'),
  ('Plumbing', 'purchase'),
  ('Paint', 'purchase'),
  ('Tiles', 'purchase'),
  ('Timber / Shuttering', 'purchase'),
  ('Transport / Freight', 'purchase'),
  ('Tools & Equipment', 'purchase'),
  ('Labour', 'labour'),
  ('Mason', 'labour'),
  ('Site Food / Tea', 'other'),
  ('Site Rent / Utilities', 'other'),
  ('Miscellaneous', 'other')
on conflict (name, type) do nothing;
