import type { CleaningSchedule } from '../types/database';
import { todayISO } from './utils';

/**
 * Cleaning assignments are saved as dated versions. The one in force is the
 * latest version that has started; `next` is a version scheduled for later.
 */
export function activeCleaning(rows: CleaningSchedule[], today = todayISO()) {
  const dates = [...new Set(rows.map((r) => r.start_date))].sort();
  const started = dates.filter((d) => d <= today);
  const current = started.at(-1) ?? dates[0];
  const next = dates.find((d) => d > today && d !== current);
  return {
    date: current as string | undefined,
    next,
    rows: rows.filter((r) => r.start_date === current).sort((a, b) => a.sort_order - b.sort_order),
  };
}
