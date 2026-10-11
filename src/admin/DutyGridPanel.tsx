import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ClipboardPaste, LoaderCircle, Minus, Plus, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { DUTY_META, DUTY_ORDER, SEMINAR_DUTY_META, SEMINAR_DUTY_ORDER } from '../lib/duty';
import { addDays, cn, dotDate, parseISODate, shortDate, toISODate, todayISO, weekdayShort } from '../lib/utils';
import { Skeleton } from '../components/ui';

/** "31, 32" → district; anything with letters → people's / team names. */
const isDistrictList = (v: string) => /^[\d\s,]+$/.test(v);

type Row = { id: string; [col: string]: unknown };

interface RosterConfig {
  table: 'service_duties' | 'seminar_daily_duties';
  dateCol: string;
  rows: { type: string; label: string }[];
  /** Cell text shown for a stored row. */
  toValue: (r: Row) => string;
  /** Min column width — names need more room than district numbers. */
  cellWidth: string;
  /** Columns written for a cell's text. */
  toFields: (value: string) => Record<string, unknown>;
}

const SUNDAY: RosterConfig = {
  table: 'service_duties',
  dateCol: 'week_date',
  rows: DUTY_ORDER.map((t) => ({ type: t, label: DUTY_META[t].label })),
  cellWidth: 'min-w-18',
  toValue: (r) => String(r.district ?? r.assignees ?? ''),
  toFields: (v) => (isDistrictList(v) ? { district: v } : { district: null, assignees: v }),
};

const SEMINAR: RosterConfig = {
  table: 'seminar_daily_duties',
  dateCol: 'day_date',
  rows: SEMINAR_DUTY_ORDER.map((t) => ({ type: t, label: SEMINAR_DUTY_META[t].label })),
  cellWidth: 'min-w-48',
  toValue: (r) => String(r.assignees ?? ''),
  toFields: (v) => ({ assignees: v }),
};

/* ===================================================== shared grid editor */

/**
 * Excel-like editor: rows = duties, columns = dates. A block copied from Excel
 * can be pasted into any cell and fills the grid from there. Nothing is saved
 * until «Хадгалах».
 */
function RosterGrid({
  config,
  dates,
  dateLabel,
  hint,
  header,
}: {
  config: RosterConfig;
  dates: string[];
  dateLabel: (d: string) => ReactNode;
  hint: string;
  header: ReactNode;
}) {
  const toast = useToast();
  const { reload } = useBulletin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const key = (date: string, type: string) => `${date}|${type}`;

  const original = useMemo(() => {
    const o: Record<string, string> = {};
    for (const r of rows ?? []) {
      const k = key(String(r[config.dateCol]), String(r.duty_type));
      if (!(k in o)) o[k] = config.toValue(r).trim();
    }
    return o;
  }, [rows, config]);

  const load = useCallback(async () => {
    setRows(null);
    if (dates.length === 0) return setRows([]);
    const { data, error } = await supabase!
      .from(config.table)
      .select('*')
      .gte(config.dateCol, dates[0])
      .lte(config.dateCol, dates.at(-1)!)
      .order('created_at');
    if (error) toast(error.message, 'error');
    setRows((data as Row[]) ?? []);
  }, [config, dates, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setCells(original), [original]);

  // Only cells inside the visible columns count (the date range may have shrunk).
  const visible = new Set(dates.flatMap((d) => config.rows.map((r) => key(d, r.type))));
  const changed = [...visible].filter((k) => (cells[k] ?? '').trim() !== (original[k] ?? ''));

  const onPaste = (e: ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(text.trim())) return; // single value → normal paste
    e.preventDefault();
    const matrix = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => line.split('\t'));
    setCells((c) => {
      const next = { ...c };
      matrix.forEach((cols, i) =>
        cols.forEach((v, j) => {
          const type = config.rows[row + i]?.type;
          const date = dates[col + j];
          if (type && date) next[key(date, type)] = v.trim();
        }),
      );
      return next;
    });
    toast(`${matrix.length}×${Math.max(...matrix.map((m) => m.length))} нүд буулгалаа`, 'info');
  };

  /** Enter moves down like a spreadsheet, then to the top of the next column. */
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const down = config.rows[row + 1];
    const target = down ? key(dates[col], down.type) : dates[col + 1] && key(dates[col + 1], config.rows[0].type);
    if (target) inputs.current[target]?.focus();
  };

  const save = async () => {
    if (!rows) return;
    setBusy(true);
    const byKey = new Map<string, Row[]>();
    rows.forEach((r) => {
      const k = key(String(r[config.dateCol]), String(r.duty_type));
      byKey.set(k, [...(byKey.get(k) ?? []), r]);
    });

    const inserts: Record<string, unknown>[] = [];
    const deletes: string[] = [];
    const updates: PromiseLike<{ error: { message: string } | null }>[] = [];

    for (const k of changed) {
      const [date, type] = k.split('|');
      const value = (cells[k] ?? '').trim();
      const existing = byKey.get(k) ?? [];
      if (!value) deletes.push(...existing.map((r) => r.id));
      else if (existing.length === 0) inserts.push({ [config.dateCol]: date, duty_type: type, ...config.toFields(value) });
      else {
        updates.push(supabase!.from(config.table).update(config.toFields(value)).eq('id', existing[0].id));
        deletes.push(...existing.slice(1).map((r) => r.id)); // collapse duplicates
      }
    }

    const results = await Promise.all([
      inserts.length ? supabase!.from(config.table).insert(inserts) : Promise.resolve({ error: null }),
      deletes.length ? supabase!.from(config.table).delete().in('id', deletes) : Promise.resolve({ error: null }),
      ...updates,
    ]);
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) return toast(failed.error.message, 'error');
    toast('Хадгалагдлаа');
    await load();
    void reload();
  };

  return (
    <div className="space-y-3">
      {header}

      <p className="flex items-start gap-2 px-1 text-sm text-slate-500">
        <ClipboardPaste className="mt-0.5 size-4 shrink-0" />
        {hint}
      </p>

      {rows === null ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl bg-white text-[15px] shadow-soft">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Үйлчлэл</th>
                {dates.map((d) => (
                  <th key={d} className={cn(config.cellWidth, 'bg-slate-50 px-1 py-2 text-center font-bold text-slate-800')}>
                    {dateLabel(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.rows.map(({ type, label }, row) => (
                <tr key={type}>
                  <th className="sticky left-0 z-10 whitespace-nowrap border-t border-slate-100 bg-white px-3 py-1 text-left text-sm font-semibold text-slate-800">
                    {label}
                  </th>
                  {dates.map((d, col) => {
                    const k = key(d, type);
                    const dirty = (cells[k] ?? '').trim() !== (original[k] ?? '');
                    return (
                      <td key={d} className="border-l border-t border-slate-100 p-0">
                        <input
                          ref={(el) => {
                            inputs.current[k] = el;
                          }}
                          value={cells[k] ?? ''}
                          onChange={(e) => setCells((c) => ({ ...c, [k]: e.target.value }))}
                          onPaste={(e) => onPaste(e, row, col)}
                          onKeyDown={(e) => onKeyDown(e, row, col)}
                          onFocus={(e) => e.target.select()}
                          title={cells[k] || undefined}
                          enterKeyHint="next"
                          aria-label={`${label}, ${shortDate(d)}`}
                          className={cn(
                            config.cellWidth,
                            'h-12 w-full bg-transparent px-1 text-center font-semibold text-slate-900 outline-none transition focus:bg-cyan-50 focus:ring-2 focus:ring-inset focus:ring-cyan-600',
                            dirty && 'bg-amber-50',
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-white p-2 pl-4 shadow-lg ring-1 ring-slate-200">
        <p className="flex-1 text-sm text-slate-500">{changed.length ? `${changed.length} өөрчлөлт` : 'Өөрчлөлт алга'}</p>
        <button
          type="button"
          onClick={save}
          disabled={busy || changed.length === 0}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-cyan-700 px-5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />} Хадгалах
        </button>
      </div>
    </div>
  );
}

/* ========================================================= Ням гараг */

export function sundaysOf(month: string): string[] {
  const first = parseISODate(`${month}-01`);
  const d = new Date(first);
  d.setDate(1 + ((7 - first.getDay()) % 7));
  const out: string[] = [];
  while (d.getMonth() === first.getMonth()) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export function shiftMonth(month: string, by: number): string {
  const d = parseISODate(`${month}-01`);
  d.setMonth(d.getMonth() + by);
  return toISODate(d).slice(0, 7);
}

const navButton = 'grid size-11 place-items-center rounded-xl active:bg-slate-100 disabled:opacity-30';

/** Ням гарагийн үйлчлэл: one month per screen. */
export function DutyGridPanel() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const dates = useMemo(() => sundaysOf(month), [month]);
  const today = todayISO();

  return (
    <RosterGrid
      config={SUNDAY}
      dates={dates}
      hint="Нүдэнд дүүргийн дугаар бичнэ (ж: 12, 31). Excel-ээс хүснэгтээ хуулаад эхний нүдэнд буулгавал бүгд нэг дор орно."
      dateLabel={(d) => (
        <>
          {shortDate(d)}
          {d <= today && today < addDays(d, 7) && <span className="block text-[10px] font-semibold text-cyan-700">энэ 7 хоног</span>}
        </>
      )}
      header={
        <div className="flex items-center justify-between rounded-2xl bg-white p-1.5 shadow-soft">
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Өмнөх сар" className={navButton}>
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-bold text-slate-900">
            {month.slice(0, 4)} оны {Number(month.slice(5))} сар
          </p>
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Дараа сар" className={navButton}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      }
    />
  );
}

/* ============================================================ Семинар */

const inputClass =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15';

/** Start on the seminar that is entered already (or our next one), else today. */
function defaultSeminarStart(existing: string[], seminarStarts: string[]): string {
  const today = todayISO();
  return existing.find((d) => d >= addDays(today, -7)) ?? seminarStarts.find((d) => d >= today) ?? today;
}

/** Семинарын үйлчлэл: a run of consecutive days (5 by default). */
export function SeminarGridPanel() {
  const { result } = useBulletin();
  const [start, setStart] = useState<string | null>(null);
  const [days, setDays] = useState(5);

  const initial = useMemo(
    () =>
      defaultSeminarStart(
        [...new Set((result?.data.seminarDuties ?? []).map((s) => s.day_date))].sort(),
        (result?.data.seminars ?? []).map((s) => s.start_date).sort(),
      ),
    [result],
  );
  const from = start ?? initial;
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days]);

  return (
    <RosterGrid
      config={SEMINAR}
      dates={dates}
      hint="Нүдэнд дүүрэг (ж: 31, 32) эсвэл багийн нэр (ж: Хайр баг) бичнэ. Excel-ээс хуулж буулгаж болно."
      dateLabel={(d) => (
        <>
          {weekdayShort(d)}
          <span className="block text-[11px] font-medium text-slate-400">{dotDate(d)}</span>
        </>
      )}
      header={
        <div className="flex items-end gap-2 rounded-2xl bg-white p-3 shadow-soft">
          <div className="min-w-0 flex-1">
            <label htmlFor="sem-start" className="mb-1 block text-sm font-semibold text-slate-600">
              Эхлэх өдөр
            </label>
            <input id="sem-start" type="date" value={from} onChange={(e) => e.target.value && setStart(e.target.value)} className={inputClass} />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Хоног</p>
            <div className="flex h-12 items-center rounded-xl border border-slate-300">
              <button type="button" onClick={() => setDays((n) => Math.max(1, n - 1))} disabled={days <= 1} aria-label="Хасах" className="grid h-full w-10 place-items-center disabled:opacity-30">
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center font-bold">{days}</span>
              <button type="button" onClick={() => setDays((n) => Math.min(10, n + 1))} disabled={days >= 10} aria-label="Нэмэх" className="grid h-full w-10 place-items-center disabled:opacity-30">
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
}
