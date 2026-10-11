import { useState } from 'react';
import { Check, LoaderCircle, Repeat } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { WEEKLY_PROGRAM, sameEvent } from '../lib/recurring';
import { cn, parseISODate, toISODate, todayISO, WEEKDAYS_MN } from '../lib/utils';
import { Sheet } from '../components/ui';

const inputClass =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15';

function datesOfMonth(month: string): string[] {
  const d = parseISODate(`${month}-01`);
  const out: string[] = [];
  while (toISODate(d).startsWith(month)) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Adds the weekly fellowships to every matching day of a month (skips ones already entered). */
export function RecurringFillButton({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [picked, setPicked] = useState<Set<number>>(() => new Set(WEEKLY_PROGRAM.map((_, i) => i)));
  const [busy, setBusy] = useState(false);

  const toggle = (i: number) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const fill = async () => {
    setBusy(true);
    const days = datesOfMonth(month);
    const { data: existing, error: loadErr } = await supabase!
      .from('monthly_plans')
      .select('event_date,title')
      .gte('event_date', days[0])
      .lte('event_date', days.at(-1)!);
    if (loadErr) {
      setBusy(false);
      return toast(loadErr.message, 'error');
    }

    const rows = days.flatMap((date) =>
      WEEKLY_PROGRAM.filter((t, i) => picked.has(i) && parseISODate(date).getDay() === t.weekday)
        .filter((t) => !(existing ?? []).some((e) => e.event_date === date && sameEvent(e.title, t.title)))
        .map((t) => ({ event_date: date, title: t.title, time: t.time, location: t.location, category: t.category })),
    );

    if (rows.length === 0) {
      setBusy(false);
      setOpen(false);
      return toast('Бүгд аль хэдийн орсон байна', 'info');
    }
    const { error } = await supabase!.from('monthly_plans').insert(rows);
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast(`${rows.length} хөтөлбөр нэмэгдлээ — хариуцагчийг нь засаарай`);
    setOpen(false);
    onDone();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 font-semibold text-slate-700 ring-1 ring-slate-200 active:scale-[0.98]"
      >
        <Repeat className="size-5" /> Тогтмол хөтөлбөр
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Тогтмол хөтөлбөр нэмэх"
        footer={
          <button
            type="button"
            onClick={fill}
            disabled={busy || picked.size === 0}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Repeat className="size-5" />} Сард нэмэх
          </button>
        }
      >
        <p className="text-[15px] text-slate-500">
          Сонгосон сарын бүх долоо хоногт доорх хөтөлбөр (анги, үг, нөхөрлөл) автоматаар нэмэгдэнэ. Аль хэдийн орсон өдрийнхийг алгасна.
        </p>
        <label htmlFor="rf-month" className="mb-1.5 mt-4 block text-[15px] font-semibold text-slate-700">
          Сар
        </label>
        <input id="rf-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />

        <ul className="mt-4 space-y-2">
          {WEEKLY_PROGRAM.map((t, i) => {
            const on = picked.has(i);
            return (
              <li key={t.title}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(i)}
                  className={cn('flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left transition', on ? 'bg-cyan-50' : 'bg-slate-50')}
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-md border-2',
                      on ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-slate-300 bg-white',
                    )}
                  >
                    {on && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{t.title}</span>
                    <span className="block text-sm text-slate-500">
                      {WEEKDAYS_MN[t.weekday]} · {t.time} · {t.location}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
