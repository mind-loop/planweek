import { useState } from 'react';
import { MapPin, Table2, Users } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { SEMINAR_DUTY_META, SEMINAR_DUTY_ORDER, seminarDays } from '../lib/duty';
import { cn, dotDate, parseISODate, todayISO, weekdayShort } from '../lib/utils';
import type { SeminarDailyDuty } from '../types/database';
import { Accordion, Card, EmptyState, MineBadge } from '../components/ui';

/** Districts render as "31, 32-р дүүрэг"; team names ("Хайр баг") as-is. */
const isDistrictList = (v: string) => /^[\d\s,]+$/.test(v);

/** Today if it is a seminar day, else the next one, else the first. */
function defaultDay(days: string[]): string | undefined {
  const today = todayISO();
  return days.find((d) => d >= today) ?? days[0];
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
    return <EmptyState icon={<Users className="size-8" />} title="Семинарын үйлчлэлийн хуваарь ороогүй байна" />;
  }

  const today = todayISO();
  const at = (d: string, type: string) => rows.find((r) => r.day_date === d && r.duty_type === type);

  return (
    <div>
      <p className="mb-3 px-1 text-[15px] text-slate-600">
        Библийн семинарын үйлчлэх хуваарь · <b className="text-slate-900">{dotDate(days[0])}–{dotDate(days.at(-1)!)}</b>
      </p>

      {/* Day picker */}
      <div className="mb-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(days.length, 7)}, minmax(0, 1fr))` }}>
        {days.map((d) => {
          const active = d === day;
          const mine = rows.some((r) => r.day_date === d && isMine(r.assignees));
          return (
            <button
              key={d}
              type="button"
              onClick={() => setPicked(d)}
              aria-pressed={active}
              className={cn(
                'relative flex min-h-16 flex-col items-center justify-center rounded-2xl transition active:scale-95',
                active ? 'bg-cyan-700 text-white shadow-md shadow-cyan-900/25' : 'bg-white text-slate-800 ring-1 ring-slate-200',
                d < today && !active && 'opacity-50',
              )}
            >
              <span className={cn('text-xs font-semibold', active ? 'text-cyan-100' : 'text-slate-500')}>{weekdayShort(d)}</span>
              <span className="text-xl font-extrabold leading-tight">{parseISODate(d).getDate()}</span>
              {d === today && <span className={cn('text-[10px] font-bold', active ? 'text-white' : 'text-cyan-700')}>Өнөөдөр</span>}
              {mine && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-amber-400 ring-2 ring-white" aria-label="Таны дүүрэг" />}
            </button>
          );
        })}
      </div>

      <div key={day} className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        {SEMINAR_DUTY_ORDER.map((type, i) => (
          <SeminarDutyCard key={type} type={type} row={at(day, type)} delay={i * 50} />
        ))}
      </div>

      <div className="mt-4">
        <Accordion title="Бүтэн хүснэгт" icon={<Table2 className="size-5" />}>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[330px] border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white py-2 pr-2 font-semibold text-slate-500">Үйлчлэл</th>
                  {days.map((d) => (
                    <th key={d} className={cn('px-1 py-2 text-center font-bold', d === day ? 'text-cyan-700' : 'text-slate-700')}>
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

function SeminarDutyCard({ type, row, delay }: { type: SeminarDailyDuty['duty_type']; row?: SeminarDailyDuty; delay: number }) {
  const { isMine } = useDistrict();
  const meta = SEMINAR_DUTY_META[type];
  const Icon = meta.icon;
  const mine = !!row && isMine(row.assignees);

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <Card highlighted={mine} className="flex h-full flex-col p-4">
        {mine && <MineBadge className="absolute -top-2.5 right-3" />}
        <div className="mb-3 flex items-center gap-3">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1', meta.tint)}>
            <Icon className="size-5" />
          </span>
          <h3 className="text-[17px] font-bold leading-tight text-slate-900">{meta.label}</h3>
        </div>
        {!row ? (
          <p className="text-[15px] text-slate-400">Хуваарь гараагүй</p>
        ) : isDistrictList(row.assignees) ? (
          <p
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-[15px] font-bold',
              mine ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800',
            )}
          >
            <MapPin className="size-4" /> {row.assignees}-р дүүрэг
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-[15px] font-semibold text-slate-800">
            <Users className="mt-0.5 size-4 shrink-0 text-slate-400" /> {row.assignees}
          </p>
        )}
        {row?.notes && <p className="mt-1.5 text-sm text-slate-500">{row.notes}</p>}
      </Card>
    </div>
  );
}
