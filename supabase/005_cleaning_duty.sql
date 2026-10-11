-- ============================================================================
-- Sunday duty roster gains a "Цэвэрлэгээ" row (entered in the monthly grid).
-- Safe to re-run.
-- ============================================================================
alter table public.service_duties drop constraint if exists service_duties_duty_type_check;
alter table public.service_duties
  add constraint service_duties_duty_type_check
  check (duty_type in ('kitchen', 'childcare', 'welcome', 'scripture', 'cleaning'));
