import { useState } from 'react';
import { Church, GraduationCap, Handshake, MapPin, Users } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { DUTY_META, DUTY_ORDER, dutyWeeks } from '../lib/duty';
import { addDays, cn, districtLabel, shortDate, todayISO } from '../lib/utils';
import type { DutyType, ServiceDuty } from '../types/database';
import { Card, MineBadge, SectionTitle } from '../components/ui';
import { SeminarDuties } from './SeminarDuties';

function SundayDutyView() {
  const { result } = useBulletin();
  const [weekIdx, setWeekIdx] = useState<0 | 1>(0);
  const duties = result?.data.duties ?? [];
  const weeks = dutyWeeks(duties);
  const week = weeks[weekIdx];
  const rows = duties.filter((d) => d.week_date === week);

  return (
    <div>

      {/* Segmented week toggle with sliding indicator */}
      <div role="tablist" aria-label="Долоо хоног" className="relative mb-4 grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1">
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out',
            weekIdx === 1 && 'translate-x-full',
          )}
        />
        {(['Энэ долоо хоног', 'Дараа долоо хоног'] as const).map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={weekIdx === i}
            onClick={() => setWeekIdx(i as 0 | 1)}
            className={cn(
              'relative z-10 flex min-h-12 flex-col items-center justify-center rounded-xl transition-colors',
              weekIdx === i ? 'text-cyan-800' : 'text-slate-600',
            )}
          >
            <span className="text-[15px] font-bold">{shortDate(weeks[i])}</span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      <div key={week} className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        {DUTY_ORDER.map((type, i) => (
          <DutyCard key={type} type={type} rows={rows.filter((r) => r.duty_type === type)} delay={i * 50} />
        ))}
      </div>
    </div>
  );
}

function DutyCard({ type, rows, delay }: { type: DutyType; rows: ServiceDuty[]; delay: number }) {
  const { isMine } = useDistrict();
  const meta = DUTY_META[type];
  const Icon = meta.icon;
  const mine = rows.some((r) => isMine(r.district));

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <Card highlighted={mine} className="flex h-full flex-col p-4">
        {mine && <MineBadge className="absolute -top-2.5 right-3" />}
        <div className="mb-3 flex items-center gap-3">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1', meta.tint)}>
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="text-[17px] font-bold leading-tight text-slate-900">{meta.label}</h3>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{meta.en}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-[15px] text-slate-400">Хуваарь гараагүй</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="space-y-1">
                {r.district && (
                  <p
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[15px] font-bold',
                      isMine(r.district) ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800',
                    )}
                  >
                    <MapPin className="size-4" /> {districtLabel(r.district)}
                  </p>
                )}
                {r.assignees && (
                  <p className="flex items-start gap-1.5 text-[15px] font-medium text-slate-700">
                    <Users className="mt-0.5 size-4 shrink-0 text-slate-400" /> {r.assignees}
                  </p>
                )}
                {r.notes && <p className="text-sm text-slate-500">{r.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

type DutyView = 'sunday' | 'seminar';

export function DutyPage() {
  const { result } = useBulletin();
  const seminarRows = result?.data.seminarDuties ?? [];
  const today = todayISO();
  // Open on the seminar roster when a seminar day falls within the next week.
  const seminarSoon = seminarRows.some((r) => r.day_date >= today && r.day_date <= addDays(today, 7));
  const [view, setView] = useState<DutyView>(seminarSoon ? 'seminar' : 'sunday');
  const showSeminar = view === 'seminar' && seminarRows.length > 0;

  return (
    <div>
      <SectionTitle icon={<Handshake className="size-5" />} title="Үйлчлэлийн хуваарь" />

      {seminarRows.length > 0 && (
        <div role="tablist" aria-label="Хуваарийн төрөл" className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'sunday'}
            onClick={() => setView('sunday')}
            className={cn(
              'flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition active:scale-95',
              view === 'sunday' ? 'bg-cyan-700 text-white shadow-md shadow-cyan-900/20' : 'bg-white text-slate-700 ring-1 ring-slate-200',
            )}
          >
            <Church className="size-4.5" /> Ням гараг
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'seminar'}
            onClick={() => setView('seminar')}
            className={cn(
              'relative flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition active:scale-95',
              view === 'seminar'
                ? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-900/25'
                : 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200',
            )}
          >
            <GraduationCap className="size-4.5" /> Семинар
            {seminarSoon && view !== 'seminar' && (
              <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full bg-violet-500 ring-2 ring-slate-50" aria-label="Удахгүй" />
            )}
          </button>
        </div>
      )}

      <div key={view} className="animate-fade-up">
        {showSeminar ? <SeminarDuties /> : <SundayDutyView />}
      </div>
    </div>
  );
}
