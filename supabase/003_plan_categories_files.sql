-- ============================================================================
-- Төлөвлөгөөний ангилал + сарын хуваарийн файл (PDF/PNG) татах.
-- Run after schema.sql. Safe to re-run.
-- ============================================================================

-- 1) Plan categories: Семинар / Нөхөрлөл / Үйлчлэл
alter table public.monthly_plans add column if not exists category text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'monthly_plans_category_check') then
    alter table public.monthly_plans
      add constraint monthly_plans_category_check check (category in ('seminar', 'fellowship', 'service'));
  end if;
end $$;

-- 2) Downloadable monthly schedule files
create table if not exists public.plan_files (
  id          uuid primary key default gen_random_uuid(),
  month       date not null,               -- first day of the month it covers
  title       text,
  file_path   text not null,               -- path inside the storage bucket
  file_url    text not null,               -- public URL
  mime_type   text,
  created_at  timestamptz not null default now()
);
create index if not exists plan_files_month_idx on public.plan_files (month desc);

alter table public.plan_files enable row level security;
drop policy if exists "public read" on public.plan_files;
create policy "public read" on public.plan_files for select using (true);
drop policy if exists "admin write" on public.plan_files;
create policy "admin write" on public.plan_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3) Public storage bucket (anyone can download, only admins upload/delete)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-files', 'plan-files', true, 20971520,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "plan-files admin select" on storage.objects;
create policy "plan-files admin select" on storage.objects for select to authenticated
  using (bucket_id = 'plan-files' and public.is_admin());

drop policy if exists "plan-files admin insert" on storage.objects;
create policy "plan-files admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'plan-files' and public.is_admin());

drop policy if exists "plan-files admin update" on storage.objects;
create policy "plan-files admin update" on storage.objects for update to authenticated
  using (bucket_id = 'plan-files' and public.is_admin());

drop policy if exists "plan-files admin delete" on storage.objects;
create policy "plan-files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'plan-files' and public.is_admin());
