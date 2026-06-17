-- CSAP GitHub Pages schema for Supabase.
-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.csap_users (
  id text primary key,
  name text not null,
  email text not null unique,
  last_names text not null,
  role text not null default 'user' check (role in ('admin', 'superuser', 'user')),
  status text not null default 'pending' check (status in ('active', 'pending', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);

create table if not exists public.csap_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'social' check (category in ('social', 'cultural', 'academic', 'food', 'professional', 'fundraiser')),
  location text,
  event_date timestamp,
  has_entry_ticket boolean not null default false,
  has_food_ticket boolean not null default false,
  registration_closes_at timestamp,
  status text not null default 'active' check (status in ('active', 'closed', 'cancelled')),
  created_by text references public.csap_users(id) on delete set null on update cascade,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.csap_registrations (
  id text primary key,
  event_id uuid not null references public.csap_events(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  guests integer not null default 0 check (guests between 0 and 5),
  entry_ticket boolean not null default false,
  food_ticket boolean not null default false,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

create table if not exists public.csap_audit_log (
  id bigint generated always as identity primary key,
  actor_id text references public.csap_users(id) on delete set null on update cascade,
  action text not null,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_csap_users_email on public.csap_users(email);
create index if not exists idx_csap_events_status on public.csap_events(status);
create index if not exists idx_csap_events_event_date on public.csap_events(event_date);
create index if not exists idx_csap_registrations_event_id on public.csap_registrations(event_id);
create index if not exists idx_csap_registrations_email on public.csap_registrations(email);

alter table public.csap_users enable row level security;
alter table public.csap_events enable row level security;
alter table public.csap_registrations enable row level security;
alter table public.csap_audit_log enable row level security;

-- Development/static-site policies.
-- These make the GitHub Pages client work with the anon key, but they are not
-- a strong admin security boundary. Tighten these if you adopt Supabase Auth.
drop policy if exists "csap_users_select" on public.csap_users;
drop policy if exists "csap_users_insert" on public.csap_users;
drop policy if exists "csap_users_update" on public.csap_users;
drop policy if exists "csap_users_delete" on public.csap_users;
create policy "csap_users_select" on public.csap_users for select to anon using (true);
create policy "csap_users_insert" on public.csap_users for insert to anon with check (true);
create policy "csap_users_update" on public.csap_users for update to anon using (true) with check (true);
create policy "csap_users_delete" on public.csap_users for delete to anon using (true);

drop policy if exists "csap_events_select" on public.csap_events;
drop policy if exists "csap_events_insert" on public.csap_events;
drop policy if exists "csap_events_update" on public.csap_events;
drop policy if exists "csap_events_delete" on public.csap_events;
create policy "csap_events_select" on public.csap_events for select to anon using (true);
create policy "csap_events_insert" on public.csap_events for insert to anon with check (true);
create policy "csap_events_update" on public.csap_events for update to anon using (true) with check (true);
create policy "csap_events_delete" on public.csap_events for delete to anon using (true);

drop policy if exists "csap_registrations_select" on public.csap_registrations;
drop policy if exists "csap_registrations_insert" on public.csap_registrations;
drop policy if exists "csap_registrations_update" on public.csap_registrations;
drop policy if exists "csap_registrations_delete" on public.csap_registrations;
create policy "csap_registrations_select" on public.csap_registrations for select to anon using (true);
create policy "csap_registrations_insert" on public.csap_registrations for insert to anon with check (true);
create policy "csap_registrations_update" on public.csap_registrations for update to anon using (true) with check (true);
create policy "csap_registrations_delete" on public.csap_registrations for delete to anon using (true);

drop policy if exists "csap_audit_log_select" on public.csap_audit_log;
drop policy if exists "csap_audit_log_insert" on public.csap_audit_log;
create policy "csap_audit_log_select" on public.csap_audit_log for select to anon using (true);
create policy "csap_audit_log_insert" on public.csap_audit_log for insert to anon with check (true);
