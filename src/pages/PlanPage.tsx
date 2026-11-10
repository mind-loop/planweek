import { useMemo, useState } from 'react';
import { ChevronRight, FileDown, LoaderCircle } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useIsAdmin } from '../lib/useIsAdmin';
import { cn, longDate, monthLabel, todayISO, weekdayMn } from '../lib/utils';
import type { MonthlyPlan, PlanCategory } from '../types/database';
import { CATEGORY_COLORS, MonthCalendar, categoryStyle, plansByDate } from '../components/MonthCalendar';
import { PlanDetailSheet } from '../components/PlanDetailSheet';

type Filter = 'all' | PlanCategory;
const CATEGORIES = Object.keys(CATEGORY_COLORS) as PlanCategory[];

/** Сарын төлөвлөгөө: a calendar; tap a day, then an event for details. */
export function PlanPage() {
  const { result } = useBulletin();
  const today = todayISO();
  const [filter, setFilter] = useState<Filter>('all');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(today);
  const [open, setOpen] = useState<MonthlyPlan | null>(null);
  const plans = result?.data.plans ?? [];
  const isAdmin = useIsAdmin(); // PDF export is for admins only

  const visible = filter === 'all' ? plans : plans.filter((p) => p.category === filter);
  const events = useMemo(() => plansByDate(visible), [visible]);
  const dayList = selected ? (events.get(selected) ?? []) : [];

  const changeMonth = (m: string) => {
    setMonth(m);
    // keep a day selected: today in the current month, otherwise the 1st
    setSelected(today.startsWith(m) ? today : `${m}-01`);
  };

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Ангилал">
        {(['all', ...CATEGORIES] as Filter[]).map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={cn(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition active:scale-95',
                active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 shadow-soft',
              )}
            >
              {f !== 'all' && <span className={cn('size-2 rounded-full', CATEGORY_COLORS[f].dot)} />}
              {f === 'all' ? 'Бүгд' : CATEGORY_COLORS[f].label}
            </button>
          );
        })}
      </div>

      <MonthCalendar
        month={month}
        onMonthChange={changeMonth}
        events={events}
        selected={selected}
        onSelect={setSelected}
        footerAction={isAdmin && <MonthPdfButton month={month} plans={plans} churchName={result?.data.churchInfo.church_name ?? 'УВС'} />}
      />

      {/* Selected day */}
      {selected && (
        <section key={selected} className="animate-fade-up">
          <h3 className="mb-2 px-1 text-[15px] font-bold text-slate-900">
            {selected === today ? 'Өнөөдөр · ' : ''}
            {longDate(selected)}, {weekdayMn(selected)}
          </h3>
          {dayList.length === 0 ? (
            <p className="rounded-3xl bg-white px-5 py-6 text-center text-[15px] text-slate-400 shadow-soft">Энэ өдөр үйл ажиллагаа алга</p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-soft">
              {dayList.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpen(p)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50">
                    <span className={cn('h-10 w-1 shrink-0 rounded-full', categoryStyle(p.category).dot)} />
                    <span className="w-12 shrink-0 text-[15px] font-bold text-slate-900">{p.time?.split(/[–-]/)[0] ?? '—'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">{p.title}</span>
                      <span className="block truncate text-sm text-slate-500">
                        {[categoryStyle(p.category).label, p.speaker, p.location].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <PlanDetailSheet plan={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* ------------------------------------------------------ Calendar → PDF */

/** Admin-only: prints the month shown on the calendar as an A4 PDF (church calendar layout). */
export function MonthPdfButton({ month, plans, churchName }: { month: string; plans: MonthlyPlan[]; churchName: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const count = plans.filter((p) => p.event_date.startsWith(month) || (p.end_date ?? '').startsWith(month)).length;
  if (count === 0) return null;

  const download = async () => {
    setBusy(true);
    try {
      const { downloadMonthPdf } = await import('../lib/calendarPdf');
      await downloadMonthPdf(month, plans, churchName);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'PDF үүсгэж чадсангүй', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      aria-label={`${monthLabel(`${month}-01`)}ын төлөвлөгөөг PDF-ээр татах`}
      title="PDF татах"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-cyan-700 px-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      PDF
    </button>
  );
}
