import { useState } from 'react';
import { ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { cn, parseISODate, splitList, todayISO } from '../../lib/utils';
import { SectionTitle, Sheet } from '../../components/ui';
import { SeminarRow, SeminarSchedule, homeKey } from '../SeminarSchedule';

/**
 * Библийн семинар — every church's seminar that falls in the current month.
 * Upcoming / ongoing ones come first; finished ones fold away behind a toggle
 * so the list stays short, but are shown if nothing else is left this month.
 */
export function SeminarsSection() {
  const { result } = useBulletin();
  const [allOpen, setAllOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
  if (!result) return null;

  const today = todayISO();
  const ym = today.slice(0, 7);
  const monthNo = parseISODate(today).getMonth() + 1;
  const home = homeKey(result.data.churchInfo.church_name);

  // Overlaps this month (a seminar may start late last month or run into next).
  const inMonth = result.data.seminars
    .filter((s) => s.start_date.slice(0, 7) <= ym && s.end_date.slice(0, 7) >= ym)
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.sort_order - b.sort_order);
  if (inMonth.length === 0) return null;

  const active = inMonth.filter((s) => s.end_date >= today);
  const past = inMonth.filter((s) => s.end_date < today);
  const shown = active.length ? active : past;
  const folded = active.length ? past : [];
  const churchCount = new Set(inMonth.flatMap((s) => splitList(s.churches).map((c) => c.toLowerCase()))).size;

  return (
    <section>
      <SectionTitle
        icon={<GraduationCap className="size-5" />}
        title={`Библийн семинар · ${monthNo} сар`}
        action={
          <button type="button" onClick={() => setAllOpen(true)} className="flex min-h-11 items-center gap-0.5 px-1 text-sm font-semibold text-cyan-700">
            Бүгд <ChevronRight className="size-4" />
          </button>
        }
      />
      <p className="-mt-1 mb-3 px-1 text-sm text-slate-500">
        Энэ сард {churchCount} чуулган оролцоно
        {!active.length && ' · Бүгд дууссан'}
      </p>

      <ul className="space-y-3">
        {shown.map((s, i) => (
          <SeminarRow key={s.id} seminar={s} home={home} delay={i * 50} />
        ))}
      </ul>

      {folded.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl text-sm font-semibold text-slate-500 active:bg-slate-100"
          >
            {showPast ? 'Дууссаныг нуух' : `Энэ сард дууссан (${folded.length})`}
            <ChevronDown className={cn('size-4 transition-transform', showPast && 'rotate-180')} />
          </button>
          {showPast && (
            <ul className="mt-1 space-y-3">
              {folded.map((s, i) => (
                <SeminarRow key={s.id} seminar={s} home={home} delay={i * 50} />
              ))}
            </ul>
          )}
        </>
      )}

      <Sheet open={allOpen} onClose={() => setAllOpen(false)} title="Библийн семинар">
        <SeminarSchedule />
      </Sheet>
    </section>
  );
}
