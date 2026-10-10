-- ============================================================================
-- УВС БАПТИСТ ЧУУЛГАН — Чуулганы Мэдээ
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Security model:
--   • Everyone (anon) can READ bulletin tables.
--   • Only emails listed in public.admin_emails can WRITE (after signing in).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- admins ----
-- Roles: exactly one 'superadmin' (manages admins, can hand the role over) and
-- any number of 'admin' (edit bulletin content only).
create table if not exists public.admin_emails (
  email text primary key
);
alter table public.admin_emails add column if not exists role text not null default 'admin';
alter table public.admin_emails add column if not exists created_at timestamptz not null default now();
update public.admin_emails set email = lower(trim(email)) where email <> lower(trim(email));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_emails_role_check') then
    alter table public.admin_emails add constraint admin_emails_role_check check (role in ('superadmin', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_emails_lower_check') then
    alter table public.admin_emails add constraint admin_emails_lower_check check (email = lower(email));
  end if;
end $$;

-- At most one superadmin.
create unique index if not exists admin_emails_one_superadmin on public.admin_emails ((true)) where role = 'superadmin';

alter table public.admin_emails enable row level security;
-- No policies → the table is only reachable through the functions below.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------- tables ----
create table if not exists public.church_info (
  id          int primary key default 1 check (id = 1),
  church_name text not null default 'УВС БАПТИСТ ЧУУЛГАН',
  pastor      text not null default 'Ж.Билгүүн',
  issue_no    int  not null default 1,
  issue_date  date not null default current_date,
  phone       text,
  address     text,
  map_url     text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text not null,
  body        text,
  tag         text check (tag in ('featured', 'this_week')),
  image_url   text,
  event_date  date,
  is_active   boolean not null default true,
  sort_order  int not null default 10,
  created_at  timestamptz not null default now()
);

create table if not exists public.memory_verses (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null,
  text        text not null,
  week_start  date not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.monthly_plans (
  id          uuid primary key default gen_random_uuid(),
  event_date  date not null,
  title       text not null,
  time        text,
  speaker     text,
  location    text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.service_duties (
  id          uuid primary key default gen_random_uuid(),
  week_date   date not null,
  duty_type   text not null check (duty_type in ('kitchen', 'childcare', 'welcome', 'scripture')),
  district    text,
  assignees   text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.fellowship_schedules (
  id          uuid primary key default gen_random_uuid(),
  group_name  text not null,
  day_of_week text not null,
  time        text not null,
  location    text,
  leader      text,
  notes       text,
  sort_order  int not null default 10,
  created_at  timestamptz not null default now()
);

create table if not exists public.cleaning_schedules (
  id          uuid primary key default gen_random_uuid(),
  district    text not null,
  area        text not null,
  tasks       text[] not null default '{}',
  notes       text,
  sort_order  int not null default 10,
  created_at  timestamptz not null default now()
);

-- Preset room/area names offered as tap-to-pick tags in the admin forms.
create table if not exists public.room_tags (
  name        text primary key,
  sort_order  int not null default 10,
  created_at  timestamptz not null default now()
);

insert into public.room_tags (name, sort_order) values
  ('Их танхим', 1), ('Бага танхим', 2), ('Залуучуудын өрөө', 3), ('Хүүхдийн өрөө', 4),
  ('Гал тогоо', 5), ('Оффис', 6), ('Коридор', 7), ('Ариун цэврийн өрөө', 8),
  ('Орох хаалга', 9), ('Шат', 10), ('Гадна талбай', 11)
on conflict (name) do nothing;

create index if not exists memory_verses_week_idx  on public.memory_verses (week_start);
create index if not exists monthly_plans_date_idx  on public.monthly_plans (event_date);
create index if not exists service_duties_week_idx on public.service_duties (week_date);

-- ------------------------------------------------------------------- RLS ----
do $$
declare
  t text;
begin
  foreach t in array array[
    'church_info', 'announcements', 'memory_verses', 'monthly_plans',
    'service_duties', 'fellowship_schedules', 'cleaning_schedules', 'room_tags'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);

    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------ first row ----
insert into public.church_info (id, church_name, pastor, issue_no, issue_date, address)
values (1, 'УВС БАПТИСТ ЧУУЛГАН', 'Ж.Билгүүн', 1, current_date, 'Увс аймаг, Улаангом хот')
on conflict (id) do nothing;

-- -------------------------------------------------------- role functions ----
-- All callable from the app via supabase.rpc(); each checks the caller's role.

create or replace function public.current_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_emails where email = public.current_email() and role = 'superadmin');
$$;

-- 'superadmin' | 'admin' | null
create or replace function public.my_admin_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.admin_emails where email = public.current_email();
$$;

create or replace function public.list_admins()
returns table (email text, role text, has_account boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Эрх хүрэлцэхгүй байна' using errcode = '42501';
  end if;
  return query
    select a.email, a.role,
           exists (select 1 from auth.users u where lower(u.email) = a.email),
           a.created_at
    from public.admin_emails a
    order by (a.role = 'superadmin') desc, a.created_at;
end $$;

create or replace function public.add_admin(new_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(new_email));
begin
  if not public.is_superadmin() then
    raise exception 'Зөвхөн superadmin админ нэмж чадна' using errcode = '42501';
  end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Имэйл буруу байна' using errcode = '22023';
  end if;
  insert into public.admin_emails (email, role) values (e, 'admin') on conflict (email) do nothing;
end $$;

create or replace function public.remove_admin(target_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(target_email));
begin
  if not public.is_superadmin() then
    raise exception 'Зөвхөн superadmin админ хасаж чадна' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_emails where email = e and role = 'superadmin') then
    raise exception 'Superadmin-г хасах боломжгүй. Эхлээд эрхээ шилжүүлнэ үү.' using errcode = '42501';
  end if;
  delete from public.admin_emails where email = e;
end $$;

-- Hands the superadmin role to an existing admin; the caller becomes a regular admin.
create or replace function public.transfer_superadmin(target_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(target_email));
  me text := public.current_email();
begin
  if not public.is_superadmin() then
    raise exception 'Зөвхөн superadmin эрхээ шилжүүлж чадна' using errcode = '42501';
  end if;
  if e = me then
    raise exception 'Та аль хэдийн superadmin байна' using errcode = '22023';
  end if;
  if not exists (select 1 from public.admin_emails where email = e) then
    raise exception 'Эхлээд тухайн хүнийг админаар нэмнэ үү' using errcode = '22023';
  end if;
  -- Refuse if the target cannot log in, otherwise nobody could manage admins.
  if not exists (select 1 from auth.users where lower(email) = e) then
    raise exception 'Энэ имэйлээр Supabase-д бүртгэл үүсээгүй байна' using errcode = '22023';
  end if;
  -- Demote first so the one-superadmin index is never violated.
  update public.admin_emails set role = 'admin' where email = me;
  update public.admin_emails set role = 'superadmin' where email = e;
end $$;

revoke all on function public.my_admin_role(), public.list_admins(), public.add_admin(text),
  public.remove_admin(text), public.transfer_superadmin(text) from public, anon;
grant execute on function public.my_admin_role(), public.list_admins(), public.add_admin(text),
  public.remove_admin(text), public.transfer_superadmin(text) to authenticated;

-- ------------------------------------------------------- first superadmin ----
-- 1) Supabase → Authentication → Users → "Add user" (email + password).
-- 2) The first superadmin (only set while there is none):
insert into public.admin_emails (email) values ('purevbaasankhuu@gmail.com') on conflict (email) do nothing;
update public.admin_emails set role = 'superadmin'
where email = 'purevbaasankhuu@gmail.com'
  and not exists (select 1 from public.admin_emails where role = 'superadmin');
-- 3) Recommended: Authentication → Providers → Email → turn OFF "Allow new users to sign up".
