import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardPaste, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { addDays, cn, shortDate, todayISO } from '../lib/utils';
import type { CleaningSchedule } from '../types/database';
import { Skeleton } from '../components/ui';
import { shiftMonth, sundaysOf } from './DutyGridPanel';

/** A grid row = one area; `orig` is its name as saved (to detect renames). */
type AreaRow = { key: string; name: string; orig?: string };

let seq = 0;
const newKey = () => `r${++seq}`;
const cellKey = (date: string, rowKey: string) => `${date}|${rowKey}`;
const tasksOf = (rows: CleaningSchedule[]) => (rows.find((r) => r.tasks?.length)?.tasks ?? []).join('\n');

/**
 * Цэвэрлэгээний хуваарь, entered like the Sunday duty grid:
 * rows = areas, columns = the month's Sundays, cell = district(s).
 * Each Sunday is stored as its own dated version in `cleaning_schedules`.
 */
export function CleaningAreasPanel() {
  const toast = useToast();
  const { reload } = useBulletin();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [all, setAll] = useState<CleaningSchedule[] | null>(null);
  const [rows, setRows] = useState<AreaRow[]>([]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [guide, setGuide] = useState('');
  const [busy, setBusy] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const sundays = useMemo(() => sundaysOf(month), [month]);
  const monthRows = useMemo(() => (all ?? []).filter((r) => sundays.includes(r.start_date)), [all, sundays]);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from('cleaning_schedules').select('*').order('start_date').order('sort_order');
    if (error) toast(error.message, 'error');
    setAll((data as CleaningSchedule[]) ?? []);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // (Re)build the grid whenever the month or the saved data changes.
  const original = useMemo(() => {
    if (!all) return null;
    // Areas: those used this month (in saved order); otherwise the latest earlier schedule's areas.
    const source = monthRows.length ? monthRows : (() => {
      const before = [...new Set(all.map((r) => r.start_date))].filter((d) => d < sundays[0]).sort().at(-1);
      return all.filter((r) => r.start_date === before);
    })();
    const names = [...new Set([...source].sort((a, b) => a.sort_order - b.sort_order).map((r) => r.area))];
    const areaRows: AreaRow[] = names.map((n) => ({ key: newKey(), name: n, orig: monthRows.length ? n : undefined }));
    const values: Record<string, string> = {};
    for (const r of monthRows) {
      const row = areaRows.find((a) => a.orig === r.area);
      if (row) values[cellKey(r.start_date, row.key)] = r.district;
    }
    return { areaRows, values, guide: tasksOf(monthRows.length ? monthRows : source) };
  }, [all, monthRows, sundays]);

  useEffect(() => {
    if (!original) return;
    setRows(original.areaRows);
    setCells(original.values);
    setGuide(original.guide);
  }, [original]);

  const cellChanged = (k: string) => (cells[k] ?? '').trim() !== (original?.values[k] ?? '');
  const dirty =
    !!original &&
    (guide.trim() !== original.guide.trim() ||
      rows.length !== original.areaRows.length ||
      rows.some((r, i) => r.key !== original.areaRows[i]?.key || r.name.trim() !== original.areaRows[i].name) ||
      sundays.some((d) => rows.some((r) => cellChanged(cellKey(d, r.key)))));

  const addRows = (count: number) => {
    const extra = Array.from({ length: count }, () => ({ key: newKey(), name: '' }));
    setRows((rs) => [...rs, ...extra]);
    return extra;
  };

  /** Paste an Excel block. In the area column the first pasted column is the area name. */
  const onPaste = (e: ClipboardEvent<HTMLInputElement>, rowIdx: number, col: number /* -1 = area name */) => {
    const text = e.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const matrix = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => l.split('\t').map((c) => c.trim()));
    const needed = rowIdx + matrix.length - rows.length;
    const target = needed > 0 ? [...rows, ...addRows(needed)] : rows;
    setRows((rs) => rs.map((r, i) => (col === -1 && i >= rowIdx && i < rowIdx + matrix.length ? { ...r, name: matrix[i - rowIdx][0] ?? r.name } : r)));
    setCells((c) => {
      const next = { ...c };
      matrix.forEach((vals, i) => {
        const row = target[rowIdx + i];
        const values = col === -1 ? vals.slice(1) : vals;
        values.forEach((v, j) => {
          const date = sundays[(col === -1 ? 0 : col) + j];
          if (row && date) next[cellKey(date, row.key)] = v;
        });
      });
      return next;
    });
    toast(`${matrix.length} мөр буулгалаа`, 'info');
  };

  const save = async () => {
    if (!original) return;
    const named = rows.map((r) => ({ ...r, name: r.name.trim() }));
    const unnamed = named.findIndex((r) => !r.name && sundays.some((d) => (cells[cellKey(d, r.key)] ?? '').trim()));
    if (unnamed >= 0) return toast(`${unnamed + 1}-р мөрөнд хэсгийн нэр бичнэ үү`, 'error');

    setBusy(true);
    const tasks = guide
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    const guideChanged = guide.trim() !== original.guide.trim();
    const inserts: Record<string, unknown>[] = [];
    const deletes: string[] = [];
    const updates: PromiseLike<{ error: { message: string } | null }>[] = [];
    const touched = new Set<string>();

    named.forEach((row, i) => {
      for (const date of sundays) {
        const value = (cells[cellKey(date, row.key)] ?? '').trim();
        const existing = row.orig ? monthRows.find((r) => r.start_date === date && r.area === row.orig) : undefined;
        if (existing) touched.add(existing.id);
        if (!value || !row.name) {
          if (existing) deletes.push(existing.id);
        } else if (!existing) {
          inserts.push({ start_date: date, area: row.name, district: value, tasks, sort_order: i });
        } else if (existing.district !== value || existing.area !== row.name || existing.sort_order !== i || guideChanged) {
          updates.push(supabase!.from('cleaning_schedules').update({ district: value, area: row.name, sort_order: i, tasks }).eq('id', existing.id));
        }
      }
    });
    // Rows removed from the grid → their saved cells go too.
    monthRows.forEach((r) => !touched.has(r.id) && deletes.push(r.id));

    const results = await Promise.all([
      deletes.length ? supabase!.from('cleaning_schedules').delete().in('id', deletes) : Promise.resolve({ error: null }),
      inserts.length ? supabase!.from('cleaning_schedules').insert(inserts) : Promise.resolve({ error: null }),
      ...updates,
    ]);
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) return toast(failed.error.message, 'error');
    toast('Хадгалагдлаа');
    await load();
    void reload();
  };

  if (!all || !original) return <Skeleton className="h-72 rounded-2xl" />;

  const today = todayISO();

  return (
    <div className="space-y-3">
      {/* Month switcher */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-1.5 shadow-soft">
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Өмнөх сар" className="grid size-11 place-items-center rounded-xl active:bg-slate-100">
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-bold text-slate-900">
          {month.slice(0, 4)} оны {Number(month.slice(5))} сар
        </p>
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Дараа сар" className="grid size-11 place-items-center rounded-xl active:bg-slate-100">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <p className="flex items-start gap-2 px-1 text-sm text-slate-500">
        <ClipboardPaste className="mt-0.5 size-4 shrink-0" />
        Мөр бүр нэг хэсэг, багана бүр нэг Ням гараг. Нүдэнд дүүрэг бичнэ. Excel-ээс «Хэсэг ⇥ 10/4 ⇥ 10/11 …» хүснэгтээ хуулаад эхний нүдэнд буулгаж болно.
      </p>

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl bg-white text-[15px] shadow-soft">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-40 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Хэсэг</th>
              {sundays.map((d) => (
                <th key={d} className="min-w-18 bg-slate-50 px-1 py-2.5 text-center font-bold text-slate-800">
                  {shortDate(d)}
                  {d <= today && today < addDays(d, 7) && <span className="block text-[10px] font-semibold text-cyan-700">энэ 7 хоног</span>}
                </th>
              ))}
              <th className="w-10 bg-slate-50" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => {
              const renamed = row.name.trim() !== (row.orig ?? '') || !row.orig;
              return (
                <tr key={row.key}>
                  <th className={cn('sticky left-0 z-10 border-t border-slate-100 bg-white p-0', renamed && row.name && 'bg-amber-50')}>
                    <input
                      value={row.name}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.key === row.key ? { ...x, name: e.target.value } : x)))}
                      onPaste={(e) => onPaste(e, r, -1)}
                      placeholder="Хэсгийн нэр"
                      aria-label={`Хэсэг, мөр ${r + 1}`}
                      className="h-12 w-full min-w-40 bg-transparent px-3 text-left text-sm font-semibold text-slate-800 outline-none focus:bg-cyan-50 focus:ring-2 focus:ring-inset focus:ring-cyan-600"
                    />
                  </th>
                  {sundays.map((d, c) => {
                    const k = cellKey(d, row.key);
                    return (
                      <td key={d} className="border-l border-t border-slate-100 p-0">
                        <input
                          ref={(el) => {
                            inputs.current[k] = el;
                          }}
                          value={cells[k] ?? ''}
                          onChange={(e) => setCells((cs) => ({ ...cs, [k]: e.target.value }))}
                          onPaste={(e) => onPaste(e, r, c)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const below = rows[r + 1];
                            if (below) inputs.current[cellKey(d, below.key)]?.focus();
                          }}
                          enterKeyHint="next"
                          aria-label={`${row.name || 'Хэсэг'}, ${shortDate(d)}`}
                          className={cn(
                            'h-12 w-full min-w-18 bg-transparent px-1 text-center font-semibold text-slate-900 outline-none transition focus:bg-cyan-50 focus:ring-2 focus:ring-inset focus:ring-cyan-600',
                            cellChanged(k) && 'bg-amber-50',
                          )}
                        />
                      </td>
                    );
                  })}
                  <td className="border-t border-slate-100 p-0">
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== row.key))}
                      aria-label="Мөр устгах"
                      className="grid h-12 w-10 place-items-center text-slate-300 active:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => addRows(1)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-semibold text-cyan-700 shadow-soft active:bg-cyan-50"
      >
        <Plus className="size-4" /> Хэсэг нэмэх
      </button>

      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <label htmlFor="clean-guide" className="mb-1.5 block text-[15px] font-semibold text-slate-700">
          Цэвэрлэгээний заавар
        </label>
        <textarea
          id="clean-guide"
          rows={5}
          value={guide}
          onChange={(e) => setGuide(e.target.value)}
          placeholder={'Хана арчих\nЦонх арчих\nХогийн сав угааж, уут солих'}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15"
        />
        <p className="mt-1 text-sm text-slate-500">Мөр бүрт нэг ажил. Бүх хэсэгт ижил үйлчилнэ.</p>
      </div>

      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-white p-2 pl-4 shadow-lg ring-1 ring-slate-200">
        <p className="flex-1 text-sm text-slate-500">{dirty ? 'Хадгалаагүй өөрчлөлт бий' : 'Өөрчлөлт алга'}</p>
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
