import { useCallback, useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { CalendarDays, ClipboardPaste, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { activeCleaning } from '../lib/cleaning';
import { cn, dotDate, todayISO } from '../lib/utils';
import type { CleaningSchedule } from '../types/database';
import { Skeleton } from '../components/ui';

type Draft = { id?: string; district: string; area: string };

const inputBase =
  'h-12 w-full bg-transparent px-2 font-semibold text-slate-900 outline-none transition focus:bg-cyan-50 focus:ring-2 focus:ring-inset focus:ring-cyan-600';

const tasksOf = (rows: CleaningSchedule[]) => (rows.find((r) => r.tasks?.length)?.tasks ?? []).join('\n');

/**
 * Цэвэрлэгээний хуваарь: which district looks after which area, saved as
 * dated versions ("хэрэгжих огноо"). Two-column, Excel-like editor.
 */
export function CleaningAreasPanel() {
  const toast = useToast();
  const { reload } = useBulletin();
  const [all, setAll] = useState<CleaningSchedule[] | null>(null);
  const [date, setDate] = useState<string>('');
  const [rows, setRows] = useState<Draft[]>([]);
  const [guide, setGuide] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from('cleaning_schedules').select('*').order('start_date').order('sort_order');
    if (error) toast(error.message, 'error');
    setAll((data as CleaningSchedule[]) ?? []);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const versions = useMemo(() => [...new Set((all ?? []).map((r) => r.start_date))].sort().reverse(), [all]);
  const saved = useMemo(() => (all ?? []).filter((r) => r.start_date === date).sort((a, b) => a.sort_order - b.sort_order), [all, date]);
  const isNew = !!date && saved.length === 0;

  // First load → open the version in force today (or today's date if none yet).
  useEffect(() => {
    if (all && !date) setDate(activeCleaning(all).date ?? todayISO());
  }, [all, date]);

  // Switching date → load that version; a new date starts as a copy of the latest one.
  useEffect(() => {
    if (!all || !date) return;
    if (saved.length) {
      setRows(saved.map((r) => ({ id: r.id, district: r.district, area: r.area })));
      setGuide(tasksOf(saved));
    } else {
      const template = activeCleaning(all, date).rows;
      setRows(template.map((r) => ({ district: r.district, area: r.area })));
      setGuide(tasksOf(template));
    }
  }, [all, date, saved]);

  const dirty =
    isNew ||
    guide.trim() !== tasksOf(saved).trim() ||
    rows.length !== saved.length ||
    rows.some((r, i) => r.id !== saved[i]?.id || r.district.trim() !== saved[i].district || r.area.trim() !== saved[i].area);

  const update = (i: number, patch: Partial<Draft>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const onPaste = (e: ClipboardEvent<HTMLInputElement>, row: number, col: 0 | 1) => {
    const text = e.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const lines = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => l.split('\t'));
    setRows((rs) => {
      const next = [...rs];
      lines.forEach((cols, i) => {
        const cur = next[row + i] ?? { district: '', area: '' };
        next[row + i] =
          col === 0
            ? { ...cur, district: (cols[0] ?? cur.district).trim(), area: (cols[1] ?? cur.area).trim() }
            : { ...cur, area: (cols[0] ?? cur.area).trim() };
      });
      return next;
    });
    toast(`${lines.length} мөр буулгалаа`, 'info');
  };

  const save = async () => {
    const clean = rows.map((r) => ({ ...r, district: r.district.trim(), area: r.area.trim() })).filter((r) => r.district || r.area);
    if (clean.length === 0) return toast('Дор хаяж нэг мөр оруулна уу', 'error');
    if (clean.some((r) => !r.district || !r.area)) return toast('Мөр бүрт дүүрэг ба хэсэг хоёуланг нь бичнэ үү', 'error');

    setBusy(true);
    const tasks = guide
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    const keep = new Set(clean.map((r) => r.id).filter(Boolean));
    const deletes = saved.filter((r) => !keep.has(r.id)).map((r) => r.id);
    const inserts = clean
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => !r.id)
      .map(({ r, i }) => ({ start_date: date, district: r.district, area: r.area, tasks, sort_order: i }));
    const updates = clean
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.id)
      .map(({ r, i }) => supabase!.from('cleaning_schedules').update({ district: r.district, area: r.area, tasks, sort_order: i }).eq('id', r.id!));

    const results = await Promise.all([
      deletes.length ? supabase!.from('cleaning_schedules').delete().in('id', deletes) : Promise.resolve({ error: null }),
      inserts.length ? supabase!.from('cleaning_schedules').insert(inserts) : Promise.resolve({ error: null }),
      ...updates,
    ]);
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) return toast(failed.error.message, 'error');
    toast(`${dotDate(date)}-ны хуваарь хадгалагдлаа`);
    await load();
    void reload();
  };

  const removeVersion = async () => {
    if (!window.confirm(`${dotDate(date)}-ны цэвэрлэгээний хуваарийг бүхэлд нь устгах уу?`)) return;
    const { error } = await supabase!.from('cleaning_schedules').delete().eq('start_date', date);
    if (error) return toast(error.message, 'error');
    toast('Устгагдлаа');
    setDate('');
    await load();
    void reload();
  };

  if (!all || !date) return <Skeleton className="h-72 rounded-2xl" />;

  const today = todayISO();
  const active = activeCleaning(all).date;

  return (
    <div className="space-y-3">
      {/* Which version */}
      <div className="rounded-2xl bg-white p-3 shadow-soft">
        <label htmlFor="clean-date" className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <CalendarDays className="size-4" /> Хэрэгжих огноо
        </label>
        <input
          id="clean-date"
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 shadow-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15"
        />
        {versions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {versions.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDate(v)}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold transition',
                  v === date ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700',
                )}
              >
                {dotDate(v)}
                {v === active && <span className={cn('text-[11px]', v === date ? 'text-emerald-300' : 'text-emerald-600')}>· мөрдөж буй</span>}
                {v > today && <span className={cn('text-[11px]', v === date ? 'text-white/60' : 'text-slate-400')}>· удахгүй</span>}
              </button>
            ))}
          </div>
        )}
        {isNew && (
          <p className="mt-2.5 rounded-xl bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
            Шинэ хуваарь — сүүлийн хуваариас хуулж бэлдлээ. Засаад хадгална уу.
          </p>
        )}
      </div>

      <p className="flex items-start gap-2 px-1 text-sm text-slate-500">
        <ClipboardPaste className="mt-0.5 size-4 shrink-0" />
        Excel-ээс 2 баганаа (дүүрэг, хэсэг) хуулаад эхний нүдэнд буулгаж болно.
      </p>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="grid grid-cols-[88px_1fr_44px] bg-slate-50 text-xs font-semibold text-slate-500">
          <span className="px-3 py-2.5">Дүүрэг</span>
          <span className="border-l border-slate-100 px-3 py-2.5">Хариуцах хэсэг</span>
          <span />
        </div>
        {rows.map((r, i) => {
          const before = saved.find((s) => s.id === r.id);
          const changed = !before || before.district !== r.district.trim() || before.area !== r.area.trim();
          return (
            <div key={r.id ?? `new-${i}`} className={cn('grid grid-cols-[88px_1fr_44px] border-t border-slate-100', changed && 'bg-amber-50')}>
              <input
                value={r.district}
                onChange={(e) => update(i, { district: e.target.value })}
                onPaste={(e) => onPaste(e, i, 0)}
                onFocus={(e) => e.target.select()}
                placeholder="12, 31"
                aria-label={`Дүүрэг, мөр ${i + 1}`}
                className={cn(inputBase, 'text-center')}
              />
              <input
                value={r.area}
                onChange={(e) => update(i, { area: e.target.value })}
                onPaste={(e) => onPaste(e, i, 1)}
                onFocus={(e) => e.target.select()}
                placeholder="Их танхим"
                aria-label={`Хэсэг, мөр ${i + 1}`}
                className={cn(inputBase, 'border-l border-slate-100')}
              />
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                aria-label="Мөр устгах"
                className="grid place-items-center text-slate-300 active:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, { district: '', area: '' }])}
          className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-slate-100 text-[15px] font-semibold text-cyan-700 active:bg-cyan-50"
        >
          <Plus className="size-4" /> Мөр нэмэх
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <label htmlFor="clean-guide" className="mb-1.5 block text-[15px] font-semibold text-slate-700">
          Цэвэрлэгээний заавар
        </label>
        <textarea
          id="clean-guide"
          rows={6}
          value={guide}
          onChange={(e) => setGuide(e.target.value)}
          placeholder={'Хана арчих\nЦонх арчих\nХогийн сав угааж, уут солих'}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15"
        />
        <p className="mt-1 text-sm text-slate-500">Мөр бүрт нэг ажил. Бүх хэсэгт ижил үйлчилнэ.</p>
      </div>

      {!isNew && (
        <button
          type="button"
          onClick={removeVersion}
          className="mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-600 active:bg-red-50"
        >
          <Trash2 className="size-4" /> {dotDate(date)}-ны хуваарийг устгах
        </button>
      )}

      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-white p-2 pl-4 shadow-lg ring-1 ring-slate-200">
        <p className="flex-1 text-sm text-slate-500">
          {isNew ? `Шинэ: ${dotDate(date)}-наас` : dirty ? 'Хадгалаагүй өөрчлөлт бий' : 'Өөрчлөлт алга'}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-cyan-700 px-5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />} Хадгалах
        </button>
      </div>
    </div>
  );
}
