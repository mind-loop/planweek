-- ============================================================================
-- Plans no longer use the «Үйлчлэл» category (duties have their own schedules).
-- Safe to re-run; any leftover rows are moved to Нөхөрлөл first.
-- ============================================================================
update public.monthly_plans set category = 'fellowship' where category = 'service';

alter table public.monthly_plans drop constraint if exists monthly_plans_category_check;
alter table public.monthly_plans
  add constraint monthly_plans_category_check
  check (category in ('seminar', 'word', 'school', 'fellowship'));
