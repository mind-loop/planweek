/**
 * Fellowships that happen every week. The admin's "Тогтмол нөхөрлөл" button
 * creates them for a whole month at once; only the leader is then filled in per week.
 * weekday: 0 = Ням … 6 = Бямба.
 */
export const WEEKLY_FELLOWSHIPS = [
  { title: 'БЭЛТГЭЛ АНГИ', weekday: 0, time: '09:00', location: 'Бэлтгэл анги' },
  { title: 'БАГА АНГИ', weekday: 0, time: '09:00', location: 'Бага танхим' },
  { title: 'ЭЗЭНИЙ ӨДРИЙН ҮГ', weekday: 0, time: '11:00', location: 'Их танхим' },
  { title: 'ЛХАГВА ГАРАГИЙН ҮГ', weekday: 3, time: '18:00', location: 'Их танхим' },
  { title: 'СУРАГЧДЫН НӨХӨРЛӨЛ', weekday: 6, time: '12:00', location: 'Бага танхим' },
  { title: 'ЗАЛУУЧУУДЫН НӨХӨРЛӨЛ', weekday: 6, time: '18:00', location: 'Бага танхим' },
] as const;

/** "Залуучуудын нөхөрлөл (АХА)" and "ЗАЛУУЧУУДЫН НӨХӨРЛӨЛ" count as the same event. */
export function sameEvent(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
}
