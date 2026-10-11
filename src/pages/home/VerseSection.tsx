import { BookMarked } from 'lucide-react';
import { cn, shortDate, todayISO } from '../../lib/utils';
import type { MemoryVerse } from '../../types/database';
import { SectionTitle } from '../../components/ui';

/** This week = the latest verse whose week has started; neighbours by date. */
function pickWeeks(verses: MemoryVerse[]): { prev?: MemoryVerse; current?: MemoryVerse; next?: MemoryVerse } {
  const sorted = [...verses].sort((a, b) => a.week_start.localeCompare(b.week_start));
  const today = todayISO();
  let i = sorted.findLastIndex((v) => v.week_start <= today);
  if (i < 0) i = 0; // nothing started yet → show the first upcoming as current
  return { prev: sorted[i - 1], current: sorted[i], next: sorted[i + 1] };
}

/** Week label as a badge so it stands apart from the verse text. */
function WeekBadge({ label, date, tone }: { label: string; date: string; tone: 'past' | 'current' | 'next' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold',
        tone === 'current' && 'bg-cyan-700 text-white',
        tone === 'next' && 'bg-emerald-100 text-emerald-800',
        tone === 'past' && 'bg-slate-100 text-slate-600',
      )}
    >
      {label}
      <span className={cn('font-semibold', tone === 'current' ? 'text-cyan-100' : 'opacity-70')}>· {shortDate(date)}</span>
    </span>
  );
}

/** Цээжлэх эшлэл: last / this / next week in one card — this week highlighted. */
export function VerseSection({ verses }: { verses: MemoryVerse[] }) {
  const { prev, current, next } = pickWeeks(verses);
  if (!current) return null;

  return (
    <section className="space-y-3">
      <SectionTitle icon={<BookMarked className="size-5" />} title="Цээжлэх эшлэл" />

      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
        {prev && <SideVerse label="Өнгөрсөн долоо хоног" verse={prev} tone="past" />}

        <div className="relative overflow-hidden bg-cyan-50 p-6">
          <span className="pointer-events-none absolute -right-1 -top-7 select-none font-serif text-[150px] leading-none text-cyan-200/70" aria-hidden>
            “
          </span>
          <div className="relative">
            <WeekBadge label="Энэ долоо хоног" date={current.week_start} tone="current" />
          </div>
          <blockquote className="relative mt-3 font-serif text-[21px] leading-relaxed text-slate-900">{current.text}</blockquote>
          <p className="mt-3 text-base font-bold text-cyan-800">— {current.reference}</p>
        </div>

        {next && <SideVerse label="Ирэх долоо хоног" verse={next} tone="next" />}
      </div>
    </section>
  );
}

function SideVerse({ label, verse, tone }: { label: string; verse: MemoryVerse; tone: 'past' | 'next' }) {
  return (
    <div className="px-5 py-4">
      <WeekBadge label={label} date={verse.week_start} tone={tone} />
      <div className={cn(tone === 'past' && 'opacity-75')}>
        <p className="mt-2.5 font-serif text-[17px] leading-relaxed text-slate-800">{verse.text}</p>
        <p className="mt-1.5 text-[15px] font-bold text-slate-600">— {verse.reference}</p>
      </div>
    </div>
  );
}
