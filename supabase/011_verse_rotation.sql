-- ============================================================================
-- Цээжлэх эшлэл rotates through public/must_memo_verses_AB2019.json:
-- the admin picks the verse for one week (a Sunday); every following week
-- moves on to the next verse automatically, previous weeks to the earlier ones.
-- Safe to re-run.
-- ============================================================================
alter table public.church_info add column if not exists verse_anchor_id int;   -- verse id in the JSON
alter table public.church_info add column if not exists verse_anchor_week date; -- Sunday that verse belongs to
