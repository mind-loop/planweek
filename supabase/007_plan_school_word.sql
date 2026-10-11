-- ============================================================================
-- Two more plan categories: «Чуулганы сургууль» (school) and «Үг» (word).
-- Re-classifies existing classes / sermons that were saved as Нөхөрлөл.
-- Safe to re-run.
-- ============================================================================
alter table public.monthly_plans drop constraint if exists monthly_plans_category_check;
alter table public.monthly_plans
  add constraint monthly_plans_category_check
  check (category in ('seminar', 'fellowship', 'service', 'school', 'word'));

update public.monthly_plans set category = 'school'
where category = 'fellowship'
  and (title ilike '%бэлтгэл анги%' or title ilike '%бага анги%');

update public.monthly_plans set category = 'word'
where category = 'fellowship'
  and (title ilike '%өдрийн үг%' or title ilike '%гарагийн үг%');
