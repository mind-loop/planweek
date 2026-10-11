-- ============================================================================
-- Home-page banners: image slides managed by admins (separate from announcements).
-- Safe to re-run.
-- ============================================================================
create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  title       text,                 -- caption / alt text (optional)
  link_url    text,                 -- opened on tap (optional)
  start_date  date,                 -- show from (optional)
  end_date    date,                 -- show until (optional)
  is_active   boolean not null default true,
  sort_order  int not null default 10,
  created_at  timestamptz not null default now()
);

alter table public.banners enable row level security;
drop policy if exists "public read" on public.banners;
create policy "public read" on public.banners for select using (true);
drop policy if exists "admin write" on public.banners;
create policy "admin write" on public.banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
