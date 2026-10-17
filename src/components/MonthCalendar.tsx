import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, cn, parseISODate, toISODate, todayISO } from '../lib/utils';
import type { MonthlyPlan, PlanCategory } from '../types/database';

export const CATEGORY_COLORS: Record<PlanCategory, { chip: string; dot: string; label: string }> = {
  seminar: { chip: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500', label: 'Семинар' },
  word: { chip: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500', label: 'Үг' },
  school: { chip: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500', label: 'Чуулганы сургууль' },
  fellowship: { chip: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', label: 'Нөхөрлөл' },
};
/** Display order: Семинар, Үг, Чуулганы сургууль, Нөхөрлөл (then uncategorised). */
export const categoryRank = (c: PlanCategory | null) => {
  const i = c ? Object.keys(CATEGORY_COLORS).indexOf(c) : -1;
  return i < 0 ? 99 : i;
};

const NO_CATEGORY = { chip: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400', label: 'Бусад' };
export const categoryStyle = (c: PlanCategory | null) => (c ? CATEGORY_COLORS[c] : NO_CATEGORY);

const WEEK_HEAD = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

/** Multi-day events (seminars) appear on every day they cover. */
export function plansByDate(plans: MonthlyPlan[]): Map<string, MonthlyPlan[]> {
  const map = new Map<string, MonthlyPlan[]>();
  for (const p of plans) {
    const last = p.end_date && p.end_date > p.event_date ? p.end_date : p.event_date;
    for (let d = p.event_date; d <= last; d = addDays(d, 1)) map.set(d, [...(map.get(d) ?? []), p]);
  }
  for (const list of map.values()) list.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || categoryRank(a.category) - categoryRank(b.category));
  return map;
}

export const isMultiDay = (p: MonthlyPlan) => !!p.end_date && p.end_date > p.event_date;

const BAR_HEIGHT = 16;
const BAR_STEP = BAR_HEIGHT + 2; // bar + row gap

interface Bar {
  plan: MonthlyPlan;
  /** Column range inside the week (0 = Ням). */
  from: number;
  to: number;
  /** Real start/end fall in this week → rounded ends. */
  starts: boolean;
  ends: boolean;
  lane: number;
}

/** Slices multi-day events into one bar per week row; overlapping bars get separate lanes. */
function weekBars(plans: MonthlyPlan[], week: string[]): Bar[] {
  const first = week[0];
  const last = week[6];
  const bars = plans
    .filter((p) => p.event_date <= last && p.end_date! >= first)
    .map((p) => ({
      plan: p,
      from: p.event_date < first ? 0 : week.indexOf(p.event_date),
      to: p.end_date! > last ? 6 : week.indexOf(p.end_date!),
      starts: p.event_date >= first,
      ends: p.end_date! <= last,
      lane: 0,
    }))
    // Earlier-starting events first, so a bar continuing from last week keeps its lane.
    .sort((a, b) => a.from - b.from || a.plan.event_date.localeCompare(b.plan.event_date) || b.to - b.from - (a.to - a.from));
  const laneEnds: number[] = [];
  for (const b of bars) {
    let lane = laneEnds.findIndex((end) => end < b.from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = b.to;
    b.lane = lane;
  }
  return bars;
}

export function shiftMonth(month: string, by: number): string {
  const d = parseISODate(`${month}-01`);
  d.setMonth(d.getMonth() + by);
  return toISODate(d).slice(0, 7);
}

/** Sunday-first month grid (like the printed church calendar). */
export function MonthCalendar({
  month,
  onMonthChange,
  events,
  selected,
  onSelect,
  maxChips = 3,
  footerAction,
}: {
  month: string;
  onMonthChange: (m: string) => void;
  events: Map<string, MonthlyPlan[]>;
  selected: string | null;
  onSelect: (date: string) => void;
  maxChips?: number;
  footerAction?: ReactNode;
}) {
  const first = parseISODate(`${month}-01`);
  const start = addDays(`${month}-01`, -first.getDay());
  const weeks = Math.ceil((first.getDay() + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const today = todayISO();
  const multiDay = [...new Map([...events.values()].flat().filter(isMultiDay).map((p) => [p.id, p])).values()];

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
      <div className="flex items-center justify-between px-2 py-2">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label="Өмнөх сар" className="grid size-11 place-items-center rounded-full active:bg-slate-100">
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-[17px] font-bold text-slate-900">
          {first.getFullYear()} оны {first.getMonth() + 1} сар
        </p>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label="Дараа сар" className="grid size-11 place-items-center rounded-full active:bg-slate-100">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 pb-1.5 text-center text-xs font-semibold">
        {WEEK_HEAD.map((d, i) => (
          <span key={d} className={i === 0 ? 'text-red-500' : 'text-slate-400'}>
            {d}
          </span>
        ))}
      </div>

      {Array.from({ length: weeks }, (_, w) => {
        const week = days.slice(w * 7, w * 7 + 7);
        const bars = weekBars(multiDay, week);
        const lanes = bars.reduce((n, b) => Math.max(n, b.lane + 1), 0);
        return (
          <div key={week[0]} className="relative grid grid-cols-7">
            {week.map((d, col) => {
              const inMonth = d.startsWith(month);
              const all = events.get(d) ?? [];
              const singles = all.filter((p) => !isMultiDay(p));
              const room = Math.max(1, maxChips - lanes);
              const isSel = d === selected;
              const isToday = d === today;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onSelect(d)}
                  aria-pressed={isSel}
                  aria-label={`${d}, ${all.length} үйл ажиллагаа`}
                  className={cn(
                    'flex min-h-21 flex-col items-stretch gap-0.5 border-slate-100 p-0.5 text-left transition',
                    col !== 0 && 'border-l',
                    w > 0 && 'border-t',
                    isSel ? 'bg-cyan-50' : 'active:bg-slate-50',
                    !inMonth && 'opacity-35',
                  )}
                >
                  <span
                    className={cn(
                      'mx-auto mb-0.5 grid size-6 place-items-center rounded-full text-[13px] font-bold',
                      isToday ? 'bg-cyan-700 text-white' : isSel ? 'text-cyan-800' : col === 0 ? 'text-red-500' : 'text-slate-700',
                    )}
                  >
                    {parseISODate(d).getDate()}
                  </span>
                  {/* room for the multi-day bars drawn over this row */}
                  {lanes > 0 && <span aria-hidden style={{ height: lanes * BAR_STEP }} className="shrink-0" />}
                  {singles.slice(0, room).map((p) => (
                    <span key={p.id} className={cn('truncate rounded px-0.5 text-[9.5px] font-semibold leading-[1.35]', categoryStyle(p.category).chip)}>
                      {p.title}
                    </span>
                  ))}
                  {singles.length > room && <span className="px-0.5 text-[9.5px] font-bold text-slate-400">+{singles.length - room}</span>}
                </button>
              );
            })}

            {/* Multi-day events: one continuous bar per week row (taps fall through to the days). */}
            {bars.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 gap-y-0.5" style={{ gridAutoRows: BAR_HEIGHT }}>
                {bars.map((b) => (
                  <span
                    key={b.plan.id}
                    style={{ gridColumn: `${b.from + 1} / ${b.to + 2}`, gridRow: b.lane + 1 }}
                    className={cn(
                      'truncate px-1 text-[9.5px] font-bold leading-4',
                      categoryStyle(b.plan.category).chip,
                      b.starts ? 'ml-0.5 rounded-l' : '',
                      b.ends ? 'mr-0.5 rounded-r' : '',
                    )}
                  >
                    {b.starts || b.from === 0 ? b.plan.title : ' '}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 border-t border-slate-100 py-2 pl-3 pr-2">
        <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-x-4 gap-y-1 py-0.5">
          {Object.values(CATEGORY_COLORS).map((c) => (
            <span key={c.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className={cn('size-2 rounded-full', c.dot)} /> {c.label}
            </span>
          ))}
        </div>
        {/* bottom-right slot, e.g. the admin-only PDF button */}
        {footerAction}
      </div>
    </div>
  );
}
