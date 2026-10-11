import { GraduationCap } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { cn, dotDate, splitList, todayISO, weekdayShort } from '../lib/utils';
import type { NationalSeminar } from '../types/database';
import { EmptyState } from '../components/ui';

/** "УВС БАПТИСТ ЧУУЛГАН" → "увс": matched against church names in the schedule. */
function homeKey(churchName: string | undefined): string {
  return (churchName ?? 'Увс').trim().split(/\s+/)[0].toLowerCase();
}

/** Монгол чуулганы Библийн семинар — which churches attend when. */
export function SeminarSchedule() {
  const { result } = useBulletin();
  const seminars = result?.data.seminars ?? [];
  const home = homeKey(result?.data.churchInfo.church_name);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-linear-to-br from-cyan-700 to-cyan-900 p-4 text-white shadow-md shadow-cyan-950/15">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
          <GraduationCap className="size-6" />
        </span>
        <div>
          <h3 className="text-[17px] font-bold leading-tight">Монгол чуулганы Библийн семинар</h3>
          <p className="mt-0.5 text-sm text-cyan-100">Аль чуулган хэзээ оролцох вэ</p>
        </div>
      </div>

      {seminars.length === 0 ? (
        <EmptyState icon={<GraduationCap className="size-8" />} title="Семинарын хуваарь ороогүй байна" />
      ) : (
        <ul className="space-y-3">
          {seminars.map((s, i) => (
            <SeminarRow key={s.id} seminar={s} home={home} delay={i * 50} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SeminarRow({ seminar, home, delay }: { seminar: NationalSeminar; home: string; delay: number }) {
  const today = todayISO();
  const churches = splitList(seminar.churches);
  const ours = churches.some((c) => c.toLowerCase() === home);
  const live = seminar.start_date <= today && today <= seminar.end_date;
  const past = seminar.end_date < today;

  return (
    <li
      className={cn(
        'animate-fade-up flex gap-3 rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.05)] ring-1',
        ours ? 'ring-2 ring-cyan-600' : 'ring-slate-200/70',
        past && 'opacity-55',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Date range block */}
      <div
        className={cn(
          'flex w-[76px] shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center',
          ours ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-800',
        )}
      >
        <span className="text-[17px] font-extrabold leading-none">{dotDate(seminar.start_date)}</span>
        <span className={cn('text-[11px] font-semibold', ours ? 'text-cyan-100' : 'text-slate-500')}>
          {weekdayShort(seminar.start_date)}
        </span>
        <span className={cn('my-0.5 h-3 w-px', ours ? 'bg-cyan-300' : 'bg-slate-300')} aria-hidden />
        <span className="text-[17px] font-extrabold leading-none">{dotDate(seminar.end_date)}</span>
        <span className={cn('text-[11px] font-semibold', ours ? 'text-cyan-100' : 'text-slate-500')}>
          {weekdayShort(seminar.end_date)}
        </span>
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        {(ours || live) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ours && <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800">Манай чуулган</span>}
            {live && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Явагдаж байна
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {churches.map((c) => {
            const isHome = c.toLowerCase() === home;
            return (
              <span
                key={c}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[15px] font-semibold',
                  isHome ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-700',
                )}
              >
                {c}
              </span>
            );
          })}
        </div>
        {seminar.notes && <p className="mt-2 text-sm text-slate-500">{seminar.notes}</p>}
      </div>
    </li>
  );
}
