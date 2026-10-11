import { useCallback, useEffect, useState, type ClipboardEvent } from 'react';
import { ArrowDownUp, ClipboardPaste, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { cn, splitList, todayISO, weekdayShort } from '../lib/utils';
import type { NationalSeminar } from '../types/database';
import { Skeleton } from '../components/ui';

type Draft = { id?: string; start_date: string; end_date: string; churches: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-13", "10.13", "10/13", "10.13(Мя)" → ISO date (year defaults to this year). */
function parseDate(token: string, year: number): string {
  const t = token.replace(/\(.*?\)/g, '').trim();
  const iso = t.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`;
  const md = t.match(/(\d{1,2})[./](\d{1,2})/);
  return md ? `${year}-${pad(+md[1])}-${pad(+md[2])}` : '';
}

/** "10.13(Мя) - 10.18(Ня)", "10.13-10.18", "2026-10-13 – 2026-10-18" → [start, end] */
function parseRange(text: string, year: number): [string, string] {
  const tokens = text.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[./]\d{1,2}/g) ?? [];
  const start = parseDate(tokens[0] ?? '', year);
  return [start, parseDate(tokens[1] ?? '', year) || start];
}

const inputBase =
  'h-12 w-full bg-transparent px-2 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-cyan-50 focus:ring-2 focus:ring-inset focus:ring-cyan-600';
const COLS = 'grid-cols-[172px_172px_minmax(240px,1fr)_44px]';

/** Монгол чуулганы Библийн семинар — every church's dates, edited as a table. */
export function NationalSeminarsPanel() {
  const toast = useToast();
  const { reload, result } = useBulletin();
  const [saved, setSaved] = useState<NationalSeminar[] | null>(null);
  const [rows, setRows] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const home = (result?.data.churchInfo.church_name ?? 'Увс').trim().split(/\s+/)[0].toLowerCase();
  const year = Number(todayISO().slice(0, 4));

  const load = useCallback(async () => {
    setSaved(null);
    const { data, error } = await supabase!.from('national_seminars').select('*').order('sort_order').order('start_date');
    if (error) toast(error.message, 'error');
    const list = (data as NationalSeminar[]) ?? [];
    setSaved(list);
    setRows(list.map((r) => ({ id: r.id, start_date: r.start_date, end_date: r.end_date, churches: r.churches })));
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const same = (r: Draft, s?: NationalSeminar) =>
    !!s && r.start_date === s.start_date && r.end_date === s.end_date && r.churches.trim() === s.churches;
  const dirty = !!saved && (rows.length !== saved.length || rows.some((r, i) => r.id !== saved[i]?.id || !same(r, saved[i])));

  const update = (i: number, patch: Partial<Draft>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  /** Paste rows from Excel: «range ⇥ churches» or «start ⇥ end ⇥ churches». */
  const onPaste = (e: ClipboardEvent<HTMLInputElement>, row: number) => {
    const text = e.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const lines = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => l.split('\t').map((c) => c.trim()));
    const parsed = lines
      .map((cols): Draft | null => {
        if (cols.length >= 3 && parseDate(cols[1], year)) {
          return { start_date: parseDate(cols[0], year), end_date: parseDate(cols[1], year), churches: cols.slice(2).join(', ') };
        }
        if (cols.length >= 2) {
          const [start, end] = parseRange(cols[0], year);
          return start ? { start_date: start, end_date: end, churches: cols.slice(1).join(', ') } : null;
        }
        return null;
      })
      .filter((d): d is Draft => !!d);
    if (parsed.length === 0) return toast('Огноо таньж чадсангүй. ж: 10.13 - 10.18 ⇥ Увс, Ховд', 'error');
    setRows((rs) => {
      const next = [...rs];
      parsed.forEach((d, i) => {
        next[row + i] = { ...d, id: next[row + i]?.id };
      });
      return next;
    });
    toast(`${parsed.length} мөр буулгалаа`, 'info');
  };

  const sortByDate = () => setRows((rs) => [...rs].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date)));

  const save = async () => {
    if (!saved) return;
    const clean = rows.map((r) => ({ ...r, churches: r.churches.trim() })).filter((r) => r.start_date || r.end_date || r.churches);
    const bad = clean.findIndex((r) => !r.start_date || !r.end_date || !r.churches);
    if (bad >= 0) return toast(`${bad + 1}-р мөр дутуу байна (огноо, чуулган)`, 'error');
    const backwards = clean.findIndex((r) => r.end_date < r.start_date);
    if (backwards >= 0) return toast(`${backwards + 1}-р мөр: дуусах огноо эхлэхээс өмнө байна`, 'error');

    setBusy(true);
    const keep = new Set(clean.map((r) => r.id).filter(Boolean));
    const deletes = saved.filter((r) => !keep.has(r.id)).map((r) => r.id);
    const payload = (r: Draft, i: number) => ({ start_date: r.start_date, end_date: r.end_date, churches: r.churches, sort_order: i });
    const inserts = clean.flatMap((r, i) => (r.id ? [] : [payload(r, i)]));
    const updates = clean.flatMap((r, i) => (r.id ? [supabase!.from('national_seminars').update(payload(r, i)).eq('id', r.id)] : []));

    const results = await Promise.all([
      deletes.length ? supabase!.from('national_seminars').delete().in('id', deletes) : Promise.resolve({ error: null }),
      inserts.length ? supabase!.from('national_seminars').insert(inserts) : Promise.resolve({ error: null }),
      ...updates,
    ]);
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) return toast(failed.error.message, 'error');
    toast('Хадгалагдлаа');
    await load();
    void reload();
  };

  if (!saved) return <Skeleton className="h-72 rounded-2xl" />;

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 px-1 text-sm text-slate-500">
        <ClipboardPaste className="mt-0.5 size-4 shrink-0" />
        Excel-ээс хүснэгтээ хуулаад эхний нүдэнд буулгаж болно. ж: «10.13(Мя) - 10.18(Ня) ⇥ Баянхонгор, Увс»
      </p>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="min-w-160 overflow-hidden rounded-2xl bg-white shadow-soft">
          <div className={cn('grid bg-slate-800 text-xs font-semibold text-white', COLS)}>
            <span className="px-3 py-3">Эхлэх</span>
            <span className="border-l border-white/10 px-3 py-3">Дуусах</span>
            <span className="border-l border-white/10 px-3 py-3">Чуулганууд</span>
            <span />
          </div>

          {rows.map((r, i) => {
            const ours = splitList(r.churches).some((c) => c.toLowerCase() === home);
            const changed = !r.id || !same(r, saved.find((s) => s.id === r.id));
            return (
              <div
                key={r.id ?? `new-${i}`}
                className={cn('grid border-t border-slate-100', COLS, changed ? 'bg-amber-50' : ours ? 'bg-cyan-50/60' : i % 2 === 1 && 'bg-slate-50/60')}
              >
                {(['start_date', 'end_date'] as const).map((k) => (
                  <div key={k} className={cn('flex items-center', k === 'end_date' && 'border-l border-slate-100')}>
                    <input
                      type="date"
                      value={r[k]}
                      onChange={(e) => update(i, k === 'start_date' && (!r.end_date || r.end_date < e.target.value) ? { start_date: e.target.value, end_date: e.target.value } : { [k]: e.target.value })}
                      onPaste={(e) => onPaste(e, i)}
                      aria-label={`${k === 'start_date' ? 'Эхлэх' : 'Дуусах'}, мөр ${i + 1}`}
                      className={cn(inputBase, 'min-w-0')}
                    />
                    {r[k] && <span className="pr-2 text-xs font-semibold text-slate-400">{weekdayShort(r[k])}</span>}
                  </div>
                ))}
                <div className="flex items-center border-l border-slate-100">
                  <input
                    value={r.churches}
                    onChange={(e) => update(i, { churches: e.target.value })}
                    onPaste={(e) => onPaste(e, i)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Баянхонгор, Булган, Увс"
                    aria-label={`Чуулганууд, мөр ${i + 1}`}
                    className={inputBase}
                  />
                  {ours && <span className="mr-2 shrink-0 rounded-full bg-cyan-700 px-2 py-0.5 text-[10px] font-bold text-white">Манай</span>}
                </div>
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

          <div className="grid grid-cols-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, { start_date: '', end_date: '', churches: '' }])}
              className="flex min-h-12 items-center justify-center gap-2 text-[15px] font-semibold text-cyan-700 active:bg-cyan-50"
            >
              <Plus className="size-4" /> Мөр нэмэх
            </button>
            <button
              type="button"
              onClick={sortByDate}
              className="flex min-h-12 items-center justify-center gap-2 border-l border-slate-100 text-[15px] font-semibold text-slate-600 active:bg-slate-50"
            >
              <ArrowDownUp className="size-4" /> Огноогоор эрэмбэлэх
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-white p-2 pl-4 shadow-lg ring-1 ring-slate-200">
        <p className="flex-1 text-sm text-slate-500">{dirty ? 'Хадгалаагүй өөрчлөлт бий' : `${rows.length} мөр`}</p>
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
