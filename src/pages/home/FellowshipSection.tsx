import { ChevronRight, MapPin, UserRound, Users } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { addDays, cn, shortDate, todayISO, weekdayMn } from '../../lib/utils';
import type { MonthlyPlan } from '../../types/database';
import type { TabId } from '../../components/BottomNav';
import { Card, SectionTitle } from '../../components/ui';

/** Нөхөрлөл — the next 7 days of Төлөвлөгөө items in the Нөхөрлөл category, by day. */
export function FellowshipSection({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { result } = useBulletin();
  const today = todayISO();
  const until = addDays(today, 6);
  const items = (result?.data.plans ?? [])
    .filter((p) => p.category === 'fellowship' && p.event_date >= today && p.event_date <= until)
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.time ?? '').localeCompare(b.time ?? ''));

  if (items.length === 0) return null;

  const days = new Map<string, MonthlyPlan[]>();
  items.forEach((p) => days.set(p.event_date, [...(days.get(p.event_date) ?? []), p]));

  return (
    <section>
      <SectionTitle
        icon={<Users className="size-5" />}
        title="Нөхөрлөл"
        action={
          <button type="button" onClick={() => onNavigate('plan')} className="flex min-h-11 items-center gap-0.5 px-1 text-sm font-semibold text-cyan-700">
            Бүгд <ChevronRight className="size-4" />
          </button>
        }
      />
      <Card className="overflow-hidden">
        {[...days.entries()].map(([date, list], i) => (
          <div key={date} className={cn(i > 0 && 'border-t border-slate-100')}>
            <p className={cn('px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider', date === today ? 'text-cyan-700' : 'text-slate-400')}>
              {date === today ? 'Өнөөдөр' : weekdayMn(date)} · {shortDate(date)}
            </p>
            <ul>
              {list.map((p) => (
                <li key={p.id} className="flex gap-3 px-4 py-2.5">
                  <span className="w-12 shrink-0 pt-0.5 text-[15px] font-bold text-slate-900">{p.time?.split(/[–-]/)[0] ?? '—'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-slate-900">{p.title}</p>
                    {(p.speaker || p.location) && (
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-slate-500">
                        {p.speaker && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3.5" /> {p.speaker}
                          </span>
                        )}
                        {p.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" /> {p.location}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>
    </section>
  );
}
