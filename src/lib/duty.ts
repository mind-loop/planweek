import { Baby, BookOpen, CookingPot, DoorOpen, type LucideIcon } from 'lucide-react';
import type { DutyType, ServiceDuty } from '../types/database';
import { addDays, todayISO, upcomingSunday } from './utils';

export const DUTY_ORDER: DutyType[] = ['kitchen', 'childcare', 'welcome', 'scripture'];

export const DUTY_META: Record<DutyType, { label: string; en: string; icon: LucideIcon; tint: string }> = {
  kitchen: { label: 'Гал тогоо', en: 'Kitchen', icon: CookingPot, tint: 'bg-orange-50 text-orange-700 ring-orange-100' },
  childcare: { label: 'Хүүхэд харах', en: 'Childcare', icon: Baby, tint: 'bg-pink-50 text-pink-700 ring-pink-100' },
  welcome: { label: 'Угталт', en: 'Welcome', icon: DoorOpen, tint: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  scripture: { label: 'Эшлэл унших', en: 'Scripture', icon: BookOpen, tint: 'bg-violet-50 text-violet-700 ring-violet-100' },
};

/**
 * The "current" week is the first scheduled Sunday on/after today (so mid-week
 * viewers see the coming Sunday); "next" is the one after it.
 */
export function dutyWeeks(duties: ServiceDuty[]): [string, string] {
  const today = todayISO();
  const weeks = [...new Set(duties.map((d) => d.week_date))].sort();
  const idx = weeks.findIndex((w) => w >= today);
  const current = idx >= 0 ? weeks[idx] : (weeks.at(-1) ?? upcomingSunday());
  const next = idx >= 0 && weeks[idx + 1] ? weeks[idx + 1] : addDays(current, 7);
  return [current, next];
}
