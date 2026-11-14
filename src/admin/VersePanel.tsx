import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Check, LoaderCircle, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { addDays, cn, shortDate } from '../lib/utils';
import { loadVerseBook, verseForWeek, weekSunday, type BookVerse } from '../lib/verseBook';
import { Card, Segmented, Sheet, Skeleton } from '../components/ui';
import { friendlyError, inputClass } from './AdminApp';

type Target = 'this' | 'next';

/**
 * Цээжлэх эшлэл: pick the verse for this (or next) week from the verse book;
 * every later week then moves on to the following verse by itself.
 */
export function VersePanel() {
  const toast = useToast();
  const { result, reload } = useBulletin();
  const info = result?.data.churchInfo;
  const [book, setBook] = useState<BookVerse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>('this');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [picked, setPicked] = useState<BookVerse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadVerseBook()
      .then(setBook)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const thisWeek = weekSunday();
  const targetWeek = target === 'this' ? thisWeek : addDays(thisWeek, 7);
  const anchorId = info?.verse_anchor_id ?? null;
  const anchorWeek = info?.verse_anchor_week ?? null;

  /** Verse a week gets under the saved anchor, or under a candidate one. */
  const at = (week: string, anchor: { id: number; week: string } | null) =>
    book && anchor ? verseForWeek(book, anchor.id, anchor.week, week) : undefined;
  const saved = anchorId && anchorWeek ? { id: anchorId, week: anchorWeek } : null;

  const categories = useMemo(() => [...new Set(book?.map((v) => v.category) ?? [])], [book]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (book ?? []).filter(
      (v) =>
        (!category || v.category === category) &&
        (!q || String(v.id) === q || v.ref.toLowerCase().includes(q) || v.text.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)),
    );
  }, [book, query, category]);

  const save = async () => {
    if (!picked) return;
    setBusy(true);
    const { error } = await supabase!.from('church_info').update({ verse_anchor_id: picked.id, verse_anchor_week: targetWeek }).eq('id', 1);
    setBusy(false);
    if (error) return toast(friendlyError(error.message), 'error');
    setPicked(null);
    toast('Эшлэл сонгогдлоо');
    void reload();
  };

  if (loadError) return <Card className="p-5 text-[15px] text-red-700">{loadError}</Card>;
  if (!book || !result) return <Skeleton className="h-96 rounded-2xl" />;

  const currentForTarget = at(targetWeek, saved);
  const candidate = picked ? { id: picked.id, week: targetWeek } : null;

  return (
    <div className="space-y-4">
      {/* What members see right now */}
      <Card className="overflow-hidden">
        {saved ? (
          <WeekStrip
            weeks={[addDays(thisWeek, -7), thisWeek, addDays(thisWeek, 7)]}
            verseAt={(w) => at(w, saved)}
            labels={['Өнгөрсөн', 'Энэ 7 хоног', 'Ирэх']}
          />
        ) : (
          <div className="flex items-start gap-3 p-4 text-[15px] text-slate-600">
            <BookMarked className="mt-0.5 size-5 shrink-0 text-cyan-700" />
            <p>Эшлэл сонгоогүй байна. Доороос энэ 7 хоногийн эшлэлийг сонгоход дараагийн 7 хоногууд автоматаар дараалан солигдоно.</p>
          </div>
        )}
      </Card>

      <div>
        <p className="mb-1.5 px-1 text-sm font-semibold text-slate-600">Аль 7 хоногийн эшлэлийг сонгох вэ?</p>
        <Segmented
          label="7 хоног"
          value={target}
          onChange={setTarget}
          options={[
            { id: 'this', label: `Энэ 7 хоног · ${shortDate(thisWeek)}` },
            { id: 'next', label: `Ирэх 7 хоног · ${shortDate(addDays(thisWeek, 7))}` },
          ]}
        />
      </div>

      {/* Search + category */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Хайх: Иохан 3:16, хайр, 25…"
          aria-label="Эшлэл хайх"
          className={cn(inputClass, 'pl-11')}
        />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[null, ...categories].map((c) => (
          <button
            key={c ?? 'all'}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              'min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition',
              c === category ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 shadow-soft',
            )}
          >
            {c ?? 'Бүгд'}
          </button>
        ))}
      </div>

      {/* Verse book */}
      {list.length === 0 ? (
        <Card className="p-6 text-center text-[15px] text-slate-500">Олдсонгүй</Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {list.map((v) => {
            const isCurrent = currentForTarget?.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setPicked(v)}
                className={cn('flex w-full items-start gap-3 px-4 py-3 text-left active:bg-slate-50', isCurrent && 'bg-cyan-50')}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-7 min-w-9 shrink-0 place-items-center rounded-lg px-1 text-xs font-bold tabular-nums',
                    isCurrent ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {v.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold text-slate-900">{v.ref}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-cyan-700">
                        <Check className="size-3.5" strokeWidth={3} /> {target === 'this' ? 'Энэ 7 хоног' : 'Ирэх 7 хоног'}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-slate-600">{v.text}</span>
                  <span className="mt-1 block text-xs text-slate-400">{v.category}</span>
                </span>
              </button>
            );
          })}
        </Card>
      )}

      {/* Confirm: show what the rotation will look like */}
      <Sheet
        open={!!picked}
        onClose={() => setPicked(null)}
        title={target === 'this' ? 'Энэ 7 хоногийн эшлэл' : 'Ирэх 7 хоногийн эшлэл'}
        footer={
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={() => setPicked(null)}
              aria-label="Болих"
              className="grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-600 active:scale-95"
            >
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Check className="size-5" />} Сонгох
            </button>
          </div>
        }
      >
        {picked && (
          <div className="space-y-3">
            <p className="text-[15px] leading-relaxed text-slate-600">
              Үүнээс хойш долоо хоног бүр дараагийн эшлэл рүү автоматаар шилжинэ.
            </p>
            <Card className="overflow-hidden ring-1 ring-slate-100">
              <WeekStrip
                weeks={[addDays(targetWeek, -7), targetWeek, addDays(targetWeek, 7), addDays(targetWeek, 14)]}
                verseAt={(w) => at(w, candidate)}
                labels={['Өмнөх', 'Сонгосон', 'Дараах', 'Түүний дараах']}
                highlight={1}
              />
            </Card>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** Weeks in a column: date badge, reference and the first lines of the verse. */
function WeekStrip({
  weeks,
  verseAt,
  labels,
  highlight = 1,
}: {
  weeks: string[];
  verseAt: (week: string) => BookVerse | undefined;
  labels: string[];
  highlight?: number;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {weeks.map((w, i) => {
        const v = verseAt(w);
        const on = i === highlight;
        return (
          <li key={w} className={cn('px-4 py-3', on ? 'bg-cyan-50' : 'opacity-80')}>
            <p className="flex items-center gap-2 text-xs font-bold">
              <span className={cn('rounded-full px-2 py-0.5', on ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600')}>{labels[i]}</span>
              <span className="text-slate-400">{shortDate(w)}</span>
            </p>
            {v ? (
              <>
                <p className="mt-1.5 font-bold text-slate-900">
                  <span className="mr-1.5 text-xs font-semibold text-slate-400">#{v.id}</span>
                  {v.ref}
                </p>
                <p className={cn('mt-0.5 text-sm leading-snug text-slate-600', !on && 'line-clamp-1')}>{v.text}</p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-slate-400">—</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
