import { CalendarDays, ChevronRight, GraduationCap, MapPin, UserRound } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { addDays, cn, dotDate, shortDate, todayISO, weekdayMn } from '../../lib/utils';
import { categoryStyle, isMultiDay } from '../../components/MonthCalendar';
import type { TabId } from '../../components/BottomNav';
import { Card, SectionTitle } from '../../components/ui';

const DAYS_AHEAD = 7; // today + the next 7 days (Sunday → next Sunday)

/** 7 хоногийн хөтөлбөр — every day from today to next Sunday; Үг, сургууль, нөхөрлөл under each. */
export function WeekProgramSection({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { result } = useBulletin();
  const today = todayISO();
  const until = addDays(today, DAYS_AHEAD);
  const plans = result?.data.plans ?? [];

  // Everything except seminars (those get the banner); each item shows its category colour.
  const fellowship = plans
    .filter((p) => p.category !== 'seminar' && p.event_date >= today && p.event_date <= until)
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.time ?? '').localeCompare(b.time ?? ''));
  // A multi-day seminar this week explains quiet days, so show it on top.
  const seminars = plans.filter((p) => p.category === 'seminar' && isMultiDay(p) && p.event_date <= until && p.end_date! >= today);

  if (fellowship.length === 0 && seminars.length === 0) return null;

  // Only days that actually have something on.
  const days = Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)).filter((d) => fellowship.some((p) => p.event_date === d));

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
      <p className="-mt-1 mb-2 px-1 text-sm text-slate-500">
        {shortDate(today)} – {shortDate(until)} хүртэлх хөтөлбөр
      </p>

      <Card className="overflow-hidden">
        {seminars.map((s) => (
          <div key={s.id} className="flex items-center gap-3 bg-indigo-50 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white">
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

        {days.map((date, i) => {
          const list = fellowship.filter((p) => p.event_date === date);
          const isToday = date === today;
          return (
            <div key={date} className={cn((i > 0 || seminars.length > 0) && 'border-t border-slate-100')}>
              <p className={cn('px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider', isToday ? 'text-cyan-700' : 'text-slate-500')}>
                {isToday ? 'Өнөөдөр' : weekdayMn(date)} · {shortDate(date)}
              </p>
              <ul>
                {list.map((p) => (
                  <li key={p.id} className="flex gap-3 px-4 py-2.5">
                    <span className="w-12 shrink-0 pt-0.5 text-[15px] font-bold text-slate-900">{p.time?.split(/[–-]/)[0] ?? '—'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-slate-900">{p.title}</p>
                      <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold', categoryStyle(p.category).chip)}>
                        {categoryStyle(p.category).label}
                      </span>
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
          );
        })}
      </Card>
    </section>
  );
}
