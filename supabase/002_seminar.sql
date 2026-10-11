-- ============================================================================
-- Библийн семинар: national schedule + 5-day local duty roster.
-- Run after schema.sql. Safe to re-run (seed rows only go into empty tables).
-- ============================================================================

create table if not exists public.national_seminars (
  id          uuid primary key default gen_random_uuid(),
  start_date  date not null,
  end_date    date not null check (end_date >= start_date),
  churches    text not null,
  notes       text,
  sort_order  int not null default 10,
  created_at  timestamptz not null default now()
);

create table if not exists public.seminar_daily_duties (
  id          uuid primary key default gen_random_uuid(),
  day_date    date not null,
  duty_type   text not null check (duty_type in ('welcome', 'tea', 'childcare', 'cleaning')),
  assignees   text not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists seminar_daily_duties_day_idx on public.seminar_daily_duties (day_date);

do $$
declare
  t text;
begin
  foreach t in array array['national_seminars', 'seminar_daily_duties'] loop
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

-- ------------------------------------------------- 2026 оны намрын семинар ----
insert into public.national_seminars (start_date, end_date, churches, sort_order)
select * from (values
  (date '2026-10-13', date '2026-10-18', 'Баянхонгор, Булган, Увс, Багануур, Ерөө, Хөвсгөл', 1),
  (date '2026-10-19', date '2026-10-23', 'Өмнөговь', 2),
  (date '2026-10-19', date '2026-10-25', 'УБ Төв, Алтай, Баруунхараа', 3),
  (date '2026-10-20', date '2026-10-25', 'Архангай', 4)
) v
where not exists (select 1 from public.national_seminars);

insert into public.seminar_daily_duties (day_date, duty_type, assignees)
select * from (values
  (date '2026-10-13', 'welcome', '31, 32'),
  (date '2026-10-14', 'welcome', '41, 42'),
  (date '2026-10-15', 'welcome', '11, 12'),
  (date '2026-10-16', 'welcome', '13, 21'),
  (date '2026-10-17', 'welcome', '22, 23'),
  (date '2026-10-13', 'tea', '13, 21'),
  (date '2026-10-14', 'tea', '22, 23'),
  (date '2026-10-15', 'tea', '31, 32'),
  (date '2026-10-16', 'tea', '41, 42'),
  (date '2026-10-17', 'tea', '11, 12'),
  (date '2026-10-13', 'childcare', 'Хайр баг'),
  (date '2026-10-14', 'childcare', 'Нигүүлсэл баг'),
  (date '2026-10-15', 'childcare', 'Хайр баг'),
  (date '2026-10-16', 'childcare', 'Нигүүлсэл баг'),
  (date '2026-10-17', 'childcare', 'Хайр, Нигүүлсэл багууд'),
  (date '2026-10-13', 'cleaning', '41, 42'),
  (date '2026-10-14', 'cleaning', '11, 12'),
  (date '2026-10-15', 'cleaning', '13, 21'),
  (date '2026-10-16', 'cleaning', '22, 23'),
  (date '2026-10-17', 'cleaning', '31, 32')
) v
where not exists (select 1 from public.seminar_daily_duties);
