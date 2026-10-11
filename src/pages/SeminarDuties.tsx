import { useState } from 'react';
import { GraduationCap, MapPin, Table2, Users } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { SEMINAR_DUTY_META, SEMINAR_DUTY_ORDER, seminarDays } from '../lib/duty';
import { cn, dotDate, parseISODate, todayISO, weekdayMn, weekdayShort } from '../lib/utils';
import type { SeminarDailyDuty } from '../types/database';
import { Accordion, EmptyState } from '../components/ui';

/*
 * The seminar roster deliberately uses an indigo/violet "event" palette so it
 * never gets mistaken for the regular (teal) Sunday duty schedule.
 */

/** Districts render as "31, 32-р дүүрэг"; team names ("Хайр баг") as-is. */
const isDistrictList = (v: string) => /^[\d\s,]+$/.test(v);

/** Today if it is a seminar day, else the next one, else the first. */
function defaultDay(days: string[]): string | undefined {
  const today = todayISO();
  return days.find((d) => d >= today) ?? days[0];
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / 86_400_000);
}

function statusLabel(days: string[]): { text: string; live: boolean } {
  const today = todayISO();
  const first = days[0];
  const last = days.at(-1)!;
  if (today < first) {
    const n = daysBetween(today, first);
    return { text: n === 1 ? 'Маргааш эхэлнэ' : `${n} хоногийн дараа эхэлнэ`, live: false };
  }
  if (today > last) return { text: 'Дууссан', live: false };
  const idx = days.indexOf(today);
  return { text: idx >= 0 ? `${idx + 1}-р өдөр · Өнөөдөр` : 'Явагдаж байна', live: true };
}

/** Семинарын 5 өдрийн үйлчлэлийн хуваарь */
export function SeminarDuties() {
  const { result } = useBulletin();
  const { isMine } = useDistrict();
  const rows = result?.data.seminarDuties ?? [];
  const days = seminarDays(rows);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const day = picked && days.includes(picked) ? picked : defaultDay(days);

  if (!day) {
    return <EmptyState icon={<GraduationCap className="size-8" />} title="Семинарын үйлчлэлийн хуваарь ороогүй байна" />;
  }

  const today = todayISO();
  const at = (d: string, type: string) => rows.find((r) => r.day_date === d && r.duty_type === type);
  const status = statusLabel(days);
  const dayNo = days.indexOf(day) + 1;

  return (
    <div>
      {/* Event hero */}
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-violet-700 to-indigo-900 p-5 text-white shadow-lg shadow-indigo-950/25">
        <GraduationCap className="pointer-events-none absolute -bottom-6 -right-4 size-36 text-white/10" aria-hidden />
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold',
            status.live ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20 text-white backdrop-blur',
          )}
        >
          {status.live && <span className="size-1.5 animate-pulse rounded-full bg-emerald-900" />}
          {status.text}
        </span>
        <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">Библийн семинар</h3>
        <p className="mt-0.5 text-[15px] text-indigo-100">
          Үйлчлэх хуваарь · {dotDate(days[0])} – {dotDate(days.at(-1)!)}
        </p>

        {/* Day stepper */}
        <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(days.length, 7)}, minmax(0, 1fr))` }}>
          {days.map((d, i) => {
            const active = d === day;
            const mine = rows.some((r) => r.day_date === d && isMine(r.assignees));
            return (
              <button
                key={d}
                type="button"
                onClick={() => setPicked(d)}
                aria-pressed={active}
                aria-label={`${i + 1}-р өдөр, ${weekdayMn(d)} ${dotDate(d)}`}
                className={cn(
                  'relative flex min-h-15 flex-col items-center justify-center rounded-2xl transition active:scale-95',
                  active ? 'bg-white text-indigo-900 shadow-md' : 'bg-white/10 text-white ring-1 ring-white/20',
                  d < today && !active && 'opacity-55',
                )}
              >
                <span className={cn('text-[11px] font-semibold', active ? 'text-indigo-500' : 'text-indigo-200')}>
                  {weekdayShort(d)}
                </span>
                <span className="text-xl font-extrabold leading-tight">{parseISODate(d).getDate()}</span>
                {mine && (
                  <span
                    className={cn('absolute right-1.5 top-1.5 size-2.5 rounded-full bg-amber-400 ring-2', active ? 'ring-white' : 'ring-indigo-700')}
                    aria-label="Таны дүүрэг"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day */}
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h4 className="text-lg font-bold text-slate-900">
          {dayNo}-р өдөр <span className="font-semibold text-slate-400">· {weekdayMn(day)}</span>
        </h4>
        {day === today && <span className="text-sm font-bold text-indigo-600">Өнөөдөр</span>}
      </div>

      <ul
        key={day}
        className="animate-fade-up divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-indigo-100"
      >
        {SEMINAR_DUTY_ORDER.map((type) => (
          <DutyRow key={type} type={type} row={at(day, type)} />
        ))}
      </ul>

      <div className="mt-4">
        <Accordion title="Бүтэн хүснэгт" icon={<Table2 className="size-5 text-indigo-600" />}>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-82.5 border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white py-2 pr-2 font-semibold text-slate-500">Үйлчлэл</th>
                  {days.map((d) => (
                    <th key={d} className={cn('px-1 py-2 text-center font-bold', d === day ? 'text-indigo-600' : 'text-slate-700')}>
                      {weekdayShort(d)}
                      <span className="block text-[11px] font-medium text-slate-400">{dotDate(d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEMINAR_DUTY_ORDER.map((type) => (
                  <tr key={type}>
                    <th className="sticky left-0 border-t border-slate-100 bg-white py-2 pr-2 font-semibold text-slate-800">
                      {SEMINAR_DUTY_META[type].label}
                    </th>
                    {days.map((d) => {
                      const r = at(d, type);
                      return (
                        <td
                          key={d}
                          className={cn(
                            'border-t border-slate-100 px-1 py-2 text-center font-medium leading-snug',
                            r && isDistrictList(r.assignees) && 'whitespace-nowrap',
                            r && isMine(r.assignees) ? 'bg-amber-100 font-bold text-amber-900' : 'text-slate-700',
                          )}
                        >
                          {r?.assignees ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>
      </div>
    </div>
  );
}

function DutyRow({ type, row }: { type: SeminarDailyDuty['duty_type']; row?: SeminarDailyDuty }) {
  const { isMine } = useDistrict();
  const meta = SEMINAR_DUTY_META[type];
  const Icon = meta.icon;
  const mine = !!row && isMine(row.assignees);

  return (
    <li className={cn('flex items-center gap-3 px-4 py-3.5 transition-colors', mine && 'bg-amber-50')}>
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1', meta.tint)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight text-slate-900">{meta.label}</p>
        {mine && <p className="animate-pop mt-0.5 text-xs font-bold text-amber-700">★ Таны дүүрэг</p>}
        {row?.notes && <p className="mt-0.5 text-sm text-slate-500">{row.notes}</p>}
      </div>
      {!row ? (
        <span className="text-[15px] text-slate-400">—</span>
      ) : isDistrictList(row.assignees) ? (
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[15px] font-bold',
            mine ? 'bg-amber-400 text-amber-950' : 'bg-indigo-50 text-indigo-800',
          )}
        >
          <MapPin className="size-4" /> {row.assignees}
        </span>
      ) : (
        <span className="inline-flex max-w-[55%] items-start gap-1 rounded-2xl bg-slate-100 px-3 py-1.5 text-sm font-semibold leading-snug text-slate-700">
          <Users className="mt-0.5 size-4 shrink-0" /> <span>{row.assignees}</span>
        </span>
      )}
    </li>
  );
}
