-- ============================================================================
-- Admin v2: seminar announcements, category-specific plan fields, `church` bucket.
-- Run after 003. Safe to re-run.
-- ============================================================================

-- 1) Announcements can be tagged "Семинар"
alter table public.announcements drop constraint if exists announcements_tag_check;
alter table public.announcements
  add constraint announcements_tag_check check (tag in ('featured', 'this_week', 'seminar'));

-- 2) Extra plan fields used depending on category
alter table public.monthly_plans add column if not exists end_date date;    -- Семинар: дуусах огноо
alter table public.monthly_plans add column if not exists group_name text;  -- Нөхөрлөл: аль бүлэг
alter table public.monthly_plans add column if not exists image_url text;   -- Семинар/Нөхөрлөл: зурагт зар
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'monthly_plans_end_after_start') then
    alter table public.monthly_plans
      add constraint monthly_plans_end_after_start check (end_date is null or end_date >= event_date);
  end if;
end $$;

-- 3) `church` bucket: every image and file the admin uploads (10 MB max)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('church', 'church', true, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "church admin select" on storage.objects;
create policy "church admin select" on storage.objects for select to authenticated
  using (bucket_id = 'church' and public.is_admin());

drop policy if exists "church admin insert" on storage.objects;
create policy "church admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'church' and public.is_admin());

drop policy if exists "church admin update" on storage.objects;
create policy "church admin update" on storage.objects for update to authenticated
  using (bucket_id = 'church' and public.is_admin());

drop policy if exists "church admin delete" on storage.objects;
create policy "church admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'church' and public.is_admin());
