-- ============================================================================
-- Cleaning assignments are versioned by the date they take effect.
-- Safe to re-run.
-- ============================================================================
alter table public.cleaning_schedules add column if not exists start_date date;

-- Existing rows: effective from the day they were entered.
update public.cleaning_schedules
set start_date = (created_at at time zone 'Asia/Ulaanbaatar')::date
where start_date is null;

alter table public.cleaning_schedules alter column start_date set default current_date;
alter table public.cleaning_schedules alter column start_date set not null;

create index if not exists cleaning_schedules_start_idx on public.cleaning_schedules (start_date desc);
