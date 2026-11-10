-- ============================================================================
-- New plan category «Цугларалт» (gathering): works like Нөхөрлөл, and may span
-- several days (end_date). Existing "…цугларалт" items are re-classified.
-- Safe to re-run.
-- ============================================================================
alter table public.monthly_plans drop constraint if exists monthly_plans_category_check;
alter table public.monthly_plans
  add constraint monthly_plans_category_check
  check (category in ('seminar', 'word', 'school', 'fellowship', 'gathering'));

update public.monthly_plans set category = 'gathering'
where category in ('seminar', 'fellowship')
  and title ilike '%цугларалт%';
