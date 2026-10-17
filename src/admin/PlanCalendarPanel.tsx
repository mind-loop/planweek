import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { removeByUrl } from '../lib/storage';
import { addDays, cn, longDate, parseISODate, todayISO, weekdayMn } from '../lib/utils';
import type { MonthlyPlan } from '../types/database';
import { MonthCalendar, categoryStyle, plansByDate } from '../components/MonthCalendar';
import { Sheet } from '../components/ui';
import { ADMIN_TABLES, type FormValues } from './adminSchema';
import { RecordForm, SaveButton, droppedImages, friendlyError, toFormValues, toPayload, type Row } from './AdminApp';
import { RecurringFillButton } from './RecurringFill';
import { MonthPdfButton } from '../pages/PlanPage';

const config = ADMIN_TABLES.find((t) => t.table === 'monthly_plans')!;

/** Visible grid range for a month (Sunday-first, includes neighbour-month days). */
function gridRange(month: string): [string, string] {
  const first = parseISODate(`${month}-01`);
  const start = addDays(`${month}-01`, -first.getDay());
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return [start, addDays(`${month}-${String(lastDay.getDate()).padStart(2, '0')}`, 6 - lastDay.getDay())];
}

/**
 * Төлөвлөгөө as a calendar: tap a day → see its items → tap one to edit,
 * or «Нэмэх» with the date already filled in.
 */
export function PlanCalendarPanel() {
  const toast = useToast();
  const { reload, result } = useBulletin();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string>(today);
  const [plans, setPlans] = useState<MonthlyPlan[] | null>(null);
  const [editing, setEditing] = useState<MonthlyPlan | 'new' | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [from, to] = gridRange(month);
    const { data, error } = await supabase!
      .from('monthly_plans')
      .select('*')
      .lte('event_date', to)
      .or(`event_date.gte.${from},end_date.gte.${from}`)
      .order('event_date');
    if (error) toast(error.message, 'error');
    setPlans((data as MonthlyPlan[]) ?? []);
  }, [month, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const events = useMemo(() => plansByDate(plans ?? []), [plans]);
  const dayList = events.get(selected) ?? [];

  const afterChange = async (msg: string) => {
    toast(msg);
    await load();
    void reload();
  };

  const openNew = (date = selected) => {
    setValues({ ...toFormValues(config.fields, null), event_date: date });
    setEditing('new');
  };

  const openEdit = (p: MonthlyPlan) => {
    setValues(toFormValues(config.fields, p as unknown as Row));
    setEditing(p);
  };

  /** Same details as a new item — just change the date. */
  const duplicate = () => {
    setValues((v) => ({ ...v, image_url: '' }));
    setEditing('new');
    toast('Хуулбар үүслээ — огноог нь сольж хадгална уу', 'info');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const payload = toPayload(config.fields, values);
    const { error } =
      editing === 'new'
        ? await supabase!.from('monthly_plans').insert(payload)
        : await supabase!.from('monthly_plans').update(payload).eq('id', editing.id);
    setBusy(false);
    if (error) return toast(friendlyError(error.message), 'error');
    if (editing !== 'new') droppedImages(config.fields, editing as unknown as Row, payload).forEach((u) => void removeByUrl(u));
    setEditing(null);
    setSelected(String(payload.event_date));
    await afterChange(editing === 'new' ? 'Нэмэгдлээ' : 'Шинэчлэгдлээ');
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    if (!window.confirm(`"${editing.title}"-г устгах уу?`)) return;
    const { error } = await supabase!.from('monthly_plans').delete().eq('id', editing.id);
    if (error) return toast(friendlyError(error.message), 'error');
    void removeByUrl(editing.image_url);
    setEditing(null);
    await afterChange('Устгагдлаа');
  };

  const changeMonth = (m: string) => {
    setMonth(m);
    setSelected(today.startsWith(m) ? today : `${m}-01`);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => openNew()}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white shadow-sm active:scale-[0.98]"
        >
          <Plus className="size-5" /> Нэмэх
        </button>
        <RecurringFillButton onDone={() => void load().then(reload)} />
      </div>

      <MonthCalendar
        month={month}
        onMonthChange={changeMonth}
        events={events}
        selected={selected}
        onSelect={setSelected}
        footerAction={<MonthPdfButton month={month} plans={plans ?? []} churchName={result?.data.churchInfo.church_name ?? 'УВС'} />}
      />

      <section className="rounded-3xl bg-white shadow-soft">
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <h3 className="text-[15px] font-bold text-slate-900">
            {longDate(selected)}, {weekdayMn(selected)}
          </h3>
          <button
            type="button"
            onClick={() => openNew(selected)}
            className="flex min-h-10 items-center gap-1 rounded-full bg-cyan-50 px-3 text-sm font-semibold text-cyan-800 active:scale-95"
          >
            <Plus className="size-4" /> Энэ өдөрт
          </button>
        </div>
        {plans === null ? (
          <p className="px-4 py-5 text-sm text-slate-400">Ачаалж байна…</p>
        ) : dayList.length === 0 ? (
          <p className="px-4 pb-5 pt-2 text-[15px] text-slate-400">Үйл ажиллагаа алга</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {dayList.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => openEdit(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
                  <span className={cn('h-9 w-1 shrink-0 rounded-full', categoryStyle(p.category).dot)} />
                  <span className="w-12 shrink-0 font-bold text-slate-900">{p.time?.split(/[–-]/)[0] ?? '—'}</span>
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

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Шинэ үйл ажиллагаа' : 'Засах'}
        footer={
          <div className="flex gap-2">
            {editing && editing !== 'new' && (
              <>
                <button
                  type="button"
                  onClick={remove}
                  aria-label="Устгах"
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 active:scale-95"
                >
                  <Trash2 className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={duplicate}
                  aria-label="Хуулах"
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 active:scale-95"
                >
                  <Copy className="size-5" />
                </button>
              </>
            )}
            <div className="flex-1">
              <SaveButton busy={busy} form="plan-cal-form" />
            </div>
          </div>
        }
      >
        <form id="plan-cal-form" onSubmit={submit} className="pt-1">
          <RecordForm fields={config.fields} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
        </form>
      </Sheet>
    </div>
  );
}
