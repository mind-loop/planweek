export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-date ISO string (YYYY-MM-DD) — avoids the UTC shift of Date#toISOString. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Today if it is Sunday, otherwise the coming Sunday. */
export function upcomingSunday(fromISO = todayISO()): string {
  const d = parseISODate(fromISO);
  return addDays(fromISO, (7 - d.getDay()) % 7);
}

export function firstOfMonth(fromISO = todayISO()): string {
  return `${fromISO.slice(0, 7)}-01`;
}

export const WEEKDAYS_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

export function weekdayMn(iso: string): string {
  return WEEKDAYS_MN[parseISODate(iso).getDay()];
}

/** "10/11" */
export function shortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "10 сарын 11" */
export function longDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1} сарын ${d.getDate()}`;
}

/** "2026 оны 10 сар" */
export function monthLabel(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getFullYear()} оны ${d.getMonth() + 1} сар`;
}

/** "12, 31" → ["12", "31"] */
export function parseDistricts(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;/\s]+/)
    .map((s) => s.replace(/[^\d\p{L}]/gu, '').trim())
    .filter(Boolean);
}

export function matchesDistrict(value: string | null | undefined, selected: string | null): boolean {
  if (!selected) return false;
  return parseDistricts(value).includes(selected);
}

/** "12, 31" → "12, 31-р дүүрэг" */
export function districtLabel(value: string | null | undefined): string {
  const list = parseDistricts(value);
  return list.length ? `${list.join(', ')}-р дүүрэг` : '';
}

export function sortDistricts(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, 'mn');
}
