import { useState } from 'react';
import { Check, ListChecks, MapPin, SprayCan } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { useDistrict } from '../../context/DistrictContext';
import { cn, shortDate } from '../../lib/utils';
import { activeCleaning } from '../../lib/cleaning';
import { Card, SectionTitle, Sheet } from '../../components/ui';

/** Цэвэрлэгээний хуваарь — the standing district → area assignment. */
export function CleaningSection() {
  const { result } = useBulletin();
  const { district, isMine } = useDistrict();
  const [guideOpen, setGuideOpen] = useState(false);
  const [done, setDone] = useState<Record<number, boolean>>({});

  const { date, next, rows } = activeCleaning(result?.data.cleaning ?? []);
  if (rows.length === 0) return null;

  const mine = rows.filter((r) => isMine(r.district));
  const guide = rows.find((r) => r.tasks.length)?.tasks ?? [];

  return (
    <section>
      <SectionTitle
        icon={<SprayCan className="size-5" />}
        title="Цэвэрлэгээний хуваарь"
        action={
          guide.length > 0 && (
            <button type="button" onClick={() => setGuideOpen(true)} className="flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-cyan-700">
              <ListChecks className="size-4" /> Заавар
            </button>
          )
        }
      />

      {mine.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-3xl bg-amber-50 px-4 py-3.5 ring-2 ring-amber-300">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">{district}-р дүүргийн хариуцах хэсэг</p>
            <p className="font-bold leading-snug text-amber-950">{mine.map((r) => r.area).join(', ')}</p>
          </div>
        </div>
      )}

      {date && (
        <p className="mb-2 px-1 text-sm text-slate-500">
          {shortDate(date)}-ээс мөрдөнө
          {next && <span className="font-semibold text-cyan-700"> · {shortDate(next)}-ээс шинэ хуваарь</span>}
        </p>
      )}

      <Card className="divide-y divide-slate-100 overflow-hidden">
        {rows.map((r) => {
          const own = isMine(r.district);
          return (
            <div key={r.id} className={cn('flex items-center gap-3 px-4 py-3', own && 'bg-amber-50/70')}>
              <span
                className={cn(
                  'min-w-14 shrink-0 rounded-xl px-2 py-1.5 text-center text-sm font-bold',
                  own ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-700',
                )}
              >
                {r.district}
              </span>
              <span className={cn('min-w-0 flex-1 text-[15px] leading-snug', own ? 'font-bold text-slate-900' : 'text-slate-700')}>{r.area}</span>
            </div>
          );
        })}
      </Card>

      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Цэвэрлэгээний заавар">
        <ul className="space-y-2">
          {guide.map((task, i) => {
            const on = !!done[i];
            return (
              <li key={i}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base transition',
                    on ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-800',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-md border-2 transition',
                      on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white',
                    )}
                  >
                    {on && <Check className="animate-pop size-4" strokeWidth={3} />}
                  </span>
                  <span className={cn(on && 'line-through decoration-emerald-600/50')}>{task}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </section>
  );
}
