import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Download, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { cn, longDate, monthLabel, firstOfMonth, todayISO, weekdayMn } from '../lib/utils';
import type { MonthlyPlan, PlanCategory, PlanFile } from '../types/database';
import { SectionTitle } from '../components/ui';
import { FileViewer } from '../components/FileViewer';
import { CATEGORY_COLORS, MonthCalendar, categoryStyle, plansByDate } from '../components/MonthCalendar';
import { PlanDetailSheet } from '../components/PlanDetailSheet';

type Filter = 'all' | PlanCategory;
const CATEGORIES = Object.keys(CATEGORY_COLORS) as PlanCategory[];

/** Сарын төлөвлөгөө: downloadable schedule + a calendar; tap a day, then an event for details. */
export function PlanPage() {
  const { result } = useBulletin();
  const today = todayISO();
  const [filter, setFilter] = useState<Filter>('all');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(today);
  const [open, setOpen] = useState<MonthlyPlan | null>(null);
  const plans = result?.data.plans ?? [];
  const files = result?.data.planFiles ?? [];

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
      <SectionTitle icon={<CalendarDays className="size-5" />} title="Сарын төлөвлөгөө" />

      <PlanDownloads files={files} />

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

      <MonthCalendar month={month} onMonthChange={changeMonth} events={events} selected={selected} onSelect={setSelected} />

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

