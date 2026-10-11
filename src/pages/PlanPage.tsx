import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Download, Eye, FileText, Image as ImageIcon, MapPin, Mic } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { cn, dotDate, firstOfMonth, monthLabel, parseISODate, todayISO, weekdayMn, weekdayShort } from '../lib/utils';
import type { MonthlyPlan, PlanCategory, PlanFile } from '../types/database';
import { EmptyState, InfoLine, SectionTitle } from '../components/ui';
import { FileViewer } from '../components/FileViewer';

export const CATEGORY_META: Record<PlanCategory, { label: string; badge: string; dot: string }> = {
  seminar: { label: 'Семинар', badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  fellowship: { label: 'Нөхөрлөл', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  service: { label: 'Үйлчлэл', badge: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
};
const CATEGORIES = Object.keys(CATEGORY_META) as PlanCategory[];

type Filter = 'all' | PlanCategory;

/** Сарын төлөвлөгөө: downloadable schedule + timeline filtered by category. */
export function PlanPage() {
  const { result } = useBulletin();
  const [filter, setFilter] = useState<Filter>('all');
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();
  const plans = result?.data.plans ?? [];
  const files = result?.data.planFiles ?? [];

  const byCategory = filter === 'all' ? plans : plans.filter((p) => p.category === filter);
  const nextId = byCategory.find((p) => p.event_date >= today)?.id;
  const pastCount = byCategory.filter((p) => p.event_date < today).length;

  const months = useMemo(() => {
    const visible = showPast ? byCategory : byCategory.filter((p) => p.event_date >= today);
    const map = new Map<string, MonthlyPlan[]>();
    for (const p of visible) {
      const key = p.event_date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()];
  }, [byCategory, showPast, today]);

  return (
    <div className="space-y-6">
      <SectionTitle icon={<CalendarDays className="size-5" />} title="Сарын төлөвлөгөө" />

      <PlanDownloads files={files} />

      {/* Category filter */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Ангилал">
        {(['all', ...CATEGORIES] as Filter[]).map((f) => {
          const active = f === filter;
          const count = f === 'all' ? plans.length : plans.filter((p) => p.category === f).length;
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
              {f !== 'all' && <span className={cn('size-2 rounded-full', CATEGORY_META[f].dot)} />}
              {f === 'all' ? 'Бүгд' : CATEGORY_META[f].label}
              <span className={cn('text-xs', active ? 'text-white/60' : 'text-slate-400')}>{count}</span>
            </button>
          );
        })}
      </div>

      {months.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-8" />} title="Төлөвлөгөө алга" hint={filter !== 'all' ? 'Өөр ангилал сонгоод үзээрэй' : undefined} />
      ) : (
        <div className="space-y-6">
          {months.map(([key, items]) => (
            <section key={key}>
              <h3 className="mb-3 px-1 text-sm font-semibold text-slate-500">{monthLabel(`${key}-01`)}</h3>
              <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-px before:bg-slate-200">
                {items.map((p, i) => (
                  <TimelineItem key={p.id} plan={p} isNext={p.id === nextId} past={p.event_date < today} delay={i * 40} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {pastCount > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((s) => !s)}
          className="mx-auto block min-h-11 rounded-full px-5 text-sm font-semibold text-slate-500 active:bg-slate-100"
        >
          {showPast ? 'Болсон үйл явдлыг нуух' : `Болсон үйл явдал (${pastCount})`}
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Downloads */

function downloadUrl(f: PlanFile): string {
  const ext = f.file_path.split('.').pop() ?? 'pdf';
  const name = `${f.title || monthLabel(f.month)}.${ext}`;
  // Supabase Storage sets Content-Disposition: attachment when ?download is present.
  return `${f.file_url}?download=${encodeURIComponent(name)}`;
}

function PlanDownloads({ files }: { files: PlanFile[] }) {
  const [viewing, setViewing] = useState<PlanFile | null>(null);
  if (files.length === 0) return null;

  const thisMonth = firstOfMonth(todayISO());
  const current = files.find((f) => f.month === thisMonth) ?? files[0];
  const others = files.filter((f) => f.id !== current.id).slice(0, 5);
  const isImage = (f: PlanFile) => !!f.mime_type?.startsWith('image/');
  const titleOf = (f: PlanFile) => f.title || `${monthLabel(f.month)}ын хуваарь`;

  return (
    <div className="space-y-2">
      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
            {isImage(current) ? <ImageIcon className="size-6" /> : <FileText className="size-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{titleOf(current)}</p>
            <p className="text-sm text-slate-500">
              {isImage(current) ? 'Зураг' : 'PDF'} · {monthLabel(current.month)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setViewing(current)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold text-slate-800 active:scale-[0.98]"
          >
            <Eye className="size-5" /> Харах
          </button>
          <a
            href={downloadUrl(current)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-700 font-semibold text-white active:scale-[0.98]"
          >
            <Download className="size-5" /> Татах
          </a>
        </div>
      </div>

      {others.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {others.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setViewing(f)}
              className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-medium text-slate-600 shadow-soft"
            >
              <Eye className="size-3.5" /> {monthLabel(f.month)}
            </button>
          ))}
        </div>
      )}

      <FileViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? titleOf(viewing) : ''}
        url={viewing?.file_url ?? ''}
        downloadUrl={viewing ? downloadUrl(viewing) : ''}
        isImage={!!viewing && isImage(viewing)}
      />
    </div>
  );
}

/* ---------------------------------------------------------- Timeline */

function TimelineItem({ plan, isNext, past, delay }: { plan: MonthlyPlan; isNext: boolean; past: boolean; delay: number }) {
  const isToday = plan.event_date === todayISO();
  const cat = plan.category ? CATEGORY_META[plan.category] : null;
  return (
    <li className="animate-fade-up relative flex gap-3" style={{ animationDelay: `${delay}ms` }}>
      <div
        className={cn(
          'relative z-10 flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl ring-4 ring-slate-50',
          isNext || isToday ? 'bg-cyan-700 text-white' : past ? 'bg-slate-200 text-slate-500' : 'bg-white text-slate-900 shadow-soft',
        )}
      >
        <span className="text-xl font-bold leading-none">{parseISODate(plan.event_date).getDate()}</span>
        <span className="mt-0.5 text-[11px] font-semibold leading-none opacity-80">{weekdayMn(plan.event_date)}</span>
      </div>

      <div className={cn('min-w-0 flex-1 overflow-hidden rounded-3xl bg-white shadow-soft', isNext && 'ring-2 ring-cyan-600', past && 'opacity-60')}>
        {plan.image_url && <img src={plan.image_url} alt="" loading="lazy" className="max-h-44 w-full object-cover" />}
        <div className="p-4">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {cat && <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', cat.badge)}>{cat.label}</span>}
            {plan.group_name && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{plan.group_name}</span>}
            {(isNext || isToday) && (
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', isToday ? 'bg-amber-400 text-amber-950' : 'bg-cyan-100 text-cyan-800')}>
                {isToday ? 'Өнөөдөр' : 'Дараагийнх'}
              </span>
            )}
          </div>
          <h4 className="text-[17px] font-bold leading-snug text-slate-900">{plan.title}</h4>
          <div className="mt-2 space-y-1">
            {plan.end_date && plan.end_date !== plan.event_date && (
              <InfoLine icon={<CalendarDays />}>
                {dotDate(plan.event_date)} ({weekdayShort(plan.event_date)}) – {dotDate(plan.end_date)} ({weekdayShort(plan.end_date)})
              </InfoLine>
            )}
            {plan.time && <InfoLine icon={<Clock />}>{plan.time}</InfoLine>}
            {plan.speaker && <InfoLine icon={<Mic />}>{plan.speaker}</InfoLine>}
            {plan.location && <InfoLine icon={<MapPin />}>{plan.location}</InfoLine>}
          </div>
          {plan.notes && <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{plan.notes}</p>}
        </div>
      </div>
    </li>
  );
}
