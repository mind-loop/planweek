import type { ReactNode } from 'react';
import { CalendarDays, Clock, MapPin, Mic, Users } from 'lucide-react';
import { cn, dotDate, longDate, weekdayMn, weekdayShort } from '../lib/utils';
import type { MonthlyPlan } from '../types/database';
import { categoryStyle } from './MonthCalendar';
import { Sheet } from './ui';

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 [&>svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-base font-semibold text-slate-900">{children}</p>
      </div>
    </div>
  );
}

/** Full details of one plan item. `footer` lets the admin add edit/delete buttons. */
export function PlanDetailSheet({ plan, onClose, footer }: { plan: MonthlyPlan | null; onClose: () => void; footer?: ReactNode }) {
  const cat = plan ? categoryStyle(plan.category) : null;
  const multiDay = !!plan?.end_date && plan.end_date !== plan.event_date;

  return (
    <Sheet open={!!plan} onClose={onClose} title={plan?.title ?? ''} footer={footer}>
      {plan && cat && (
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', cat.chip)}>{cat.label}</span>
            {plan.group_name && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{plan.group_name}</span>}
          </div>
          {plan.image_url && <img src={plan.image_url} alt="" className="mb-2 w-full rounded-2xl" />}
          <div className="divide-y divide-slate-100">
            <Row icon={<CalendarDays />} label="Огноо">
              {multiDay
                ? `${dotDate(plan.event_date)} (${weekdayShort(plan.event_date)}) – ${dotDate(plan.end_date!)} (${weekdayShort(plan.end_date!)})`
                : `${longDate(plan.event_date)}, ${weekdayMn(plan.event_date)}`}
            </Row>
            {plan.time && (
              <Row icon={<Clock />} label="Цаг">
                {plan.time}
              </Row>
            )}
            {plan.speaker && (
              <Row
                icon={plan.category === 'fellowship' || plan.category === 'school' ? <Users /> : <Mic />}
                label={
                  { seminar: 'Пастор / Багш', fellowship: 'Удирдагч', word: 'Номлогч', school: 'Багш', service: 'Хариуцагч' }[plan.category ?? 'service'] ??
                  'Хариуцагч'
                }
              >
                {plan.speaker}
              </Row>
            )}
            {plan.location && (
              <Row icon={<MapPin />} label="Байршил">
                {plan.location}
              </Row>
            )}
          </div>
          {plan.notes && <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-700">{plan.notes}</p>}
        </div>
      )}
    </Sheet>
  );
}
