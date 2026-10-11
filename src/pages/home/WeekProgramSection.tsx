import { CalendarDays, ChevronRight, GraduationCap, MapPin, UserRound } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { addDays, cn, dotDate, longDate, parseISODate, todayISO, weekdayMn } from '../../lib/utils';
import { categoryRank, categoryStyle, isMultiDay } from '../../components/MonthCalendar';
import type { TabId } from '../../components/BottomNav';
import { SectionTitle } from '../../components/ui';

const DAYS_AHEAD = 7; // today + the next 7 days (Sunday → next Sunday)

/** 7 хоногийн хөтөлбөр — one block per day (only days with something on), today first. */
export function WeekProgramSection({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { result } = useBulletin();
  const today = todayISO();
  const until = addDays(today, DAYS_AHEAD);
  const plans = result?.data.plans ?? [];

  // Everything except seminars (those get the banner); each item shows its category colour.
  const items = plans
    .filter((p) => p.category !== 'seminar' && p.event_date >= today && p.event_date <= until)
    .sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) ||
        (a.time ?? '').localeCompare(b.time ?? '') ||
        categoryRank(a.category) - categoryRank(b.category),
    );
  // A multi-day seminar this week explains quiet days, so show it on top.
  const seminars = plans.filter((p) => p.category === 'seminar' && isMultiDay(p) && p.event_date <= until && p.end_date! >= today);

  if (items.length === 0 && seminars.length === 0) return null;

  const days = [...new Set(items.map((p) => p.event_date))];

  return (
    <section>
      <SectionTitle
        icon={<CalendarDays className="size-5" />}
        title="7 хоногийн хөтөлбөр"
        action={
          <button type="button" onClick={() => onNavigate('plan')} className="flex min-h-11 items-center gap-0.5 px-1 text-sm font-semibold text-cyan-700">
            Бүгд <ChevronRight className="size-4" />
          </button>
        }
      />
      <p className="-mt-1 mb-3 px-1 text-sm text-slate-500">
        {longDate(today)} – {longDate(until)}
      </p>

      <div className="space-y-3">
        {seminars.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-3xl bg-indigo-50 px-4 py-3.5 ring-1 ring-indigo-100">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white">
              <GraduationCap className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-indigo-950">{s.title}</p>
              <p className="text-sm text-indigo-700">
                {dotDate(s.event_date)} – {dotDate(s.end_date!)}
                {s.time && ` · ${s.time}`}
              </p>
            </div>
          </div>
        ))}

        {days.map((date) => {
          const isToday = date === today;
          const list = items.filter((p) => p.event_date === date);
          return (
            <div key={date} className="flex gap-3 rounded-3xl bg-white p-3 shadow-soft">
              {/* Date tile */}
              <div
                className={cn(
                  'flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-2xl py-2.5',
                  isToday ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-800',
                )}
              >
                <span className="text-2xl font-bold leading-none">{parseISODate(date).getDate()}</span>
                <span className={cn('mt-1 text-[11px] font-semibold', isToday ? 'text-cyan-100' : 'text-slate-500')}>
                  {isToday ? 'Өнөөдөр' : weekdayMn(date)}
                </span>
              </div>

              {/* That day's programme */}
              <ul className="min-w-0 flex-1 divide-y divide-slate-100">
                {list.map((p) => {
                  const cat = categoryStyle(p.category);
                  return (
                    <li key={p.id} className="py-2 first:pt-1 last:pb-1">
                      <p className="flex items-baseline gap-2">
                        <span className="shrink-0 text-[15px] font-bold tabular-nums text-slate-900">{p.time?.split(/[–-]/)[0] ?? '—'}</span>
                        <span className="min-w-0 font-semibold leading-snug text-slate-900">{p.title}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-slate-500">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <span className={cn('size-2 rounded-full', cat.dot)} /> {cat.label}
                        </span>
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
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
