import { useState } from 'react';
import { Check, ChevronRight, ListChecks, MapPin, RotateCcw, SprayCan } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { GENERAL_CLEANING_GUIDE } from '../lib/mockData';
import { cn, districtLabel } from '../lib/utils';
import type { CleaningSchedule } from '../types/database';
import { Card, EmptyState, MineBadge, SectionTitle, Sheet } from '../components/ui';

export function CleaningPage() {
  const { result } = useBulletin();
  const { isMine } = useDistrict();
  const [openArea, setOpenArea] = useState<CleaningSchedule | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  // Checked items survive closing/reopening a sheet while on this page.
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const rows = result?.data.cleaning ?? [];
  // Your own area floats to the top.
  const sorted = [...rows].sort((a, b) => Number(isMine(b.district)) - Number(isMine(a.district)));

  const toggle = (key: string) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div>
      <SectionTitle icon={<SprayCan className="size-5" />} title="Цэвэрлэгээний хуваарь" />

      <button
        type="button"
        onClick={() => setGuideOpen(true)}
        className="mb-4 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-cyan-700 px-4 text-left font-semibold text-white shadow-md shadow-cyan-900/20 transition active:scale-[0.98]"
      >
        <ListChecks className="size-6" />
        <span className="flex-1">Цэвэрлэгээний ерөнхий заавар</span>
        <ChevronRight className="size-5 opacity-80" />
      </button>

      {sorted.length === 0 ? (
        <EmptyState icon={<SprayCan className="size-8" />} title="Хуваарь оруулаагүй байна" />
      ) : (
        <div className="space-y-3">
          {sorted.map((c, i) => {
            const mine = isMine(c.district);
            const done = c.tasks.filter((_, ti) => checked[`${c.id}:${ti}`]).length;
            return (
              <div key={c.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <Card highlighted={mine}>
                  {mine && <MineBadge className="absolute -top-2.5 right-3" />}
                  <button
                    type="button"
                    onClick={() => setOpenArea(c)}
                    className="flex min-h-20 w-full items-center gap-3 p-4 text-left"
                  >
                    <div
                      className={cn(
                        'flex min-w-16 flex-col items-center rounded-xl px-2 py-2 text-center',
                        mine ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700',
                      )}
                    >
                      <MapPin className="size-4" />
                      <span className="mt-0.5 text-[15px] font-extrabold leading-tight">{c.district}</span>
                      <span className="text-[11px] font-semibold">дүүрэг</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[17px] font-bold leading-snug text-slate-900">{c.area}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {c.tasks.length} ажил{done > 0 && ` · ${done} дууссан`}
                      </p>
                      {c.tasks.length > 0 && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(done / c.tasks.length) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-slate-400" />
                  </button>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Sheet
        open={!!openArea}
        onClose={() => setOpenArea(null)}
        title={openArea?.area ?? ''}
        footer={
          openArea && (
            <button
              type="button"
              onClick={() =>
                setChecked((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith(`${openArea.id}:`))))
              }
              className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-slate-500"
            >
              <RotateCcw className="size-4" /> Дахин эхлэх
            </button>
          )
        }
      >
        {openArea && (
          <>
            <p className="mb-3 text-[15px] font-semibold text-slate-600">{districtLabel(openArea.district)}</p>
            <Checklist items={openArea.tasks} prefix={openArea.id} checked={checked} onToggle={toggle} />
            {openArea.notes && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[15px] text-amber-900">{openArea.notes}</p>}
            <h4 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wider text-slate-500">Ерөнхий заавар</h4>
            <ol className="list-decimal space-y-1 pl-5 text-[15px] text-slate-600">
              {GENERAL_CLEANING_GUIDE.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
          </>
        )}
      </Sheet>

      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Цэвэрлэгээний ерөнхий заавар">
        <Checklist items={GENERAL_CLEANING_GUIDE} prefix="general" checked={checked} onToggle={toggle} />
      </Sheet>
    </div>
  );
}

function Checklist({
  items,
  prefix,
  checked,
  onToggle,
}: {
  items: string[];
  prefix: string;
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const key = `${prefix}:${i}`;
        const on = !!checked[key];
        return (
          <li key={key}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(key)}
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
              <span className={cn(on && 'line-through decoration-emerald-600/50')}>{item}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
