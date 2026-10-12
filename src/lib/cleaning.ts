import type { CleaningSchedule } from '../types/database';
import { todayISO, upcomingSunday } from './utils';

/**
 * Cleaning assignments are stored per Sunday (one dated version per column of
 * the admin grid). Members see the coming Sunday's assignment; if that Sunday
 * has none yet, the latest one that has started stays in force.
 */
export function activeCleaning(rows: CleaningSchedule[], today = todayISO()) {
  const dates = [...new Set(rows.map((r) => r.start_date))].sort();
  const sunday = upcomingSunday(today);
  const current = dates.includes(sunday) ? sunday : (dates.filter((d) => d <= today).at(-1) ?? dates[0]);
  const next = dates.find((d) => d > (current ?? today));
  return {
    date: current as string | undefined,
    next,
    rows: rows.filter((r) => r.start_date === current).sort((a, b) => a.sort_order - b.sort_order),
  };
}
