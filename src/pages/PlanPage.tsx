import { useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Mic } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { cn, monthLabel, parseISODate, todayISO, weekdayMn } from '../lib/utils';
import type { MonthlyPlan } from '../types/database';
import { EmptyState, InfoLine, SectionTitle } from '../components/ui';

export function PlanPage() {
  const { result } = useBulletin();
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();
  const plans = result?.data.plans ?? [];

  const nextId = plans.find((p) => p.event_date >= today)?.id;
  const pastCount = plans.filter((p) => p.event_date < today).length;

  const months = useMemo(() => {
    const visible = showPast ? plans : plans.filter((p) => p.event_date >= today);
    const map = new Map<string, MonthlyPlan[]>();
    for (const p of visible) {
      const key = p.event_date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()];
  }, [plans, showPast, today]);

  return (
    <div>
      <SectionTitle
        icon={<CalendarDays className="size-5" />}
        title="Сарын төлөвлөгөө"
        action={
          pastCount > 0 && (
            <button
              type="button"
              onClick={() => setShowPast((s) => !s)}
              aria-pressed={showPast}
              className={cn(
                'min-h-11 rounded-full px-4 text-sm font-semibold transition',
                showPast ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700',
              )}
            >
              {showPast ? 'Болсныг нуух' : `Болсон (${pastCount})`}
            </button>
          )
        }
      />

      {months.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-8" />} title="Төлөвлөгөө оруулаагүй байна" />
      ) : (
        <div className="space-y-6">
          {months.map(([key, items]) => (
            <section key={key}>
              <h3 className="mb-3 px-1 text-sm font-bold uppercase tracking-wider text-slate-500">
                {monthLabel(`${key}-01`)}
              </h3>
              <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-0.5 before:bg-slate-200">
                {items.map((p, i) => (
                  <TimelineItem key={p.id} plan={p} isNext={p.id === nextId} past={p.event_date < today} delay={i * 40} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ plan, isNext, past, delay }: { plan: MonthlyPlan; isNext: boolean; past: boolean; delay: number }) {
  const isToday = plan.event_date === todayISO();
  return (
    <li className="animate-fade-up relative flex gap-3" style={{ animationDelay: `${delay}ms` }}>
      <div
        className={cn(
          'relative z-10 flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl ring-4 ring-slate-50',
          isNext || isToday ? 'bg-cyan-700 text-white shadow-md shadow-cyan-900/25' : past ? 'bg-slate-200 text-slate-500' : 'bg-white text-slate-900 shadow-sm ring-slate-50',
        )}
      >
        <span className="text-xl font-extrabold leading-none">{parseISODate(plan.event_date).getDate()}</span>
        <span className="mt-0.5 text-[11px] font-semibold leading-none opacity-80">{weekdayMn(plan.event_date)}</span>
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.05)] ring-1 transition',
          isNext ? 'ring-2 ring-cyan-600' : 'ring-slate-200/70',
          past && 'opacity-60',
        )}
      >
        {(isNext || isToday || past) && (
          <span
            className={cn(
              'mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold',
              isToday ? 'bg-amber-400 text-amber-950' : isNext ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500',
            )}
          >
            {isToday ? 'Өнөөдөр' : isNext ? 'Дараагийнх' : 'Болсон'}
          </span>
        )}
        <h4 className="text-[17px] font-bold leading-snug text-slate-900">{plan.title}</h4>
        <div className="mt-2 space-y-1">
          {plan.time && <InfoLine icon={<Clock />}>{plan.time}</InfoLine>}
          {plan.speaker && <InfoLine icon={<Mic />}>{plan.speaker}</InfoLine>}
          {plan.location && <InfoLine icon={<MapPin />}>{plan.location}</InfoLine>}
        </div>
        {plan.notes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{plan.notes}</p>}
      </div>
    </li>
  );
}
