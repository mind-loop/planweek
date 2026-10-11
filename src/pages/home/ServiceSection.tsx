import { useState } from 'react';
import { ChevronRight, GraduationCap, Handshake, MapPin, Users } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { useDistrict } from '../../context/DistrictContext';
import { DUTY_META, DUTY_ORDER, dutyWeeks, seminarDays } from '../../lib/duty';
import { addDays, cn, dotDate, shortDate, todayISO } from '../../lib/utils';
import { SectionTitle, Sheet } from '../../components/ui';
import { SundayDutyView } from '../SundayDuties';
import { SeminarDuties } from '../SeminarDuties';

/** Үйлчлэл — this week's Sunday duties at a glance, plus the seminar roster when it's near. */
export function ServiceSection() {
  const { result } = useBulletin();
  const { isMine } = useDistrict();
  const [weekOpen, setWeekOpen] = useState(false);
  const [seminarOpen, setSeminarOpen] = useState(false);
  if (!result) return null;

  const duties = result.data.duties;
  const [week] = dutyWeeks(duties);
  const rows = duties.filter((d) => d.week_date === week);

  const today = todayISO();
  const semDays = seminarDays(result.data.seminarDuties);
  const seminarThisWeek = semDays.some((d) => d >= today && d <= addDays(today, 7));
  const mySeminarDays = result.data.seminarDuties.filter((s) => s.day_date >= today && isMine(s.assignees)).length;

  if (rows.length === 0 && !seminarThisWeek) return null;

  return (
    <section>
      <SectionTitle
        icon={<Handshake className="size-5" />}
        title={`Үйлчлэл · ${shortDate(week)}`}
        action={
          <button type="button" onClick={() => setWeekOpen(true)} className="flex min-h-11 items-center gap-0.5 px-1 text-sm font-semibold text-cyan-700">
            Бүгд <ChevronRight className="size-4" />
          </button>
        }
      />

      {seminarThisWeek && (
        <button
          type="button"
          onClick={() => setSeminarOpen(true)}
          className="mb-3 flex w-full items-center gap-3 rounded-3xl bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-left text-white shadow-soft transition active:scale-[0.99]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15">
            <GraduationCap className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Семинарын үйлчлэл</span>
            <span className="block text-sm text-indigo-100">
              {dotDate(semDays[0])} – {dotDate(semDays.at(-1)!)}
              {mySeminarDays > 0 && ` · Танай дүүрэг ${mySeminarDays} удаа`}
            </span>
          </span>
          <ChevronRight className="size-5 text-white/70" />
        </button>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {DUTY_ORDER.map((type) => {
            const meta = DUTY_META[type];
            const Icon = meta.icon;
            const typed = rows.filter((r) => r.duty_type === type);
            const mine = typed.some((r) => isMine(r.district));
            const who = typed.map((r) => r.district ?? r.assignees).filter(Boolean).join(' · ');
            const isDistrict = typed.some((r) => r.district);
            return (
              <button
                key={type}
                type="button"
                onClick={() => setWeekOpen(true)}
                className={cn(
                  'relative flex flex-col items-start rounded-3xl bg-white p-4 text-left shadow-soft transition odd:last:col-span-2 active:scale-[0.98]',
                  mine && 'ring-2 ring-amber-400',
                )}
              >
                {mine && <span className="absolute right-3 top-3 size-2.5 rounded-full bg-amber-400" aria-label="Таны дүүрэг" />}
                <span className={cn('grid size-10 place-items-center rounded-xl ring-1', meta.tint)}>
                  <Icon className="size-5" />
                </span>
                <span className="mt-3 text-sm font-medium text-slate-500">{meta.label}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[15px] font-bold leading-snug text-slate-900">
                  {who ? (
                    <>
                      {isDistrict ? <MapPin className="size-3.5 shrink-0 text-slate-400" /> : <Users className="size-3.5 shrink-0 text-slate-400" />}
                      <span className="line-clamp-2">{who}</span>
                    </>
                  ) : (
                    <span className="font-medium text-slate-400">—</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Sheet open={weekOpen} onClose={() => setWeekOpen(false)} title="Үйлчлэлийн хуваарь">
        <SundayDutyView />
      </Sheet>
      <Sheet open={seminarOpen} onClose={() => setSeminarOpen(false)} title="Семинарын үйлчлэл">
        <SeminarDuties />
      </Sheet>
    </section>
  );
}
