import { BookMarked, Copy, Share2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { cn, shortDate, todayISO } from '../../lib/utils';
import type { MemoryVerse } from '../../types/database';
import { SectionTitle } from '../../components/ui';

/** This week = the latest verse whose week has started; neighbours by date. */
function pickWeeks(verses: MemoryVerse[]): { prev?: MemoryVerse; current?: MemoryVerse; next?: MemoryVerse } {
  const sorted = [...verses].sort((a, b) => a.week_start.localeCompare(b.week_start));
  const today = todayISO();
  let i = sorted.findLastIndex((v) => v.week_start <= today);
  if (i < 0) i = 0; // nothing started yet → show the first upcoming as current
  return { prev: sorted[i - 1], current: sorted[i], next: sorted[i + 1] };
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older iOS / non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Цээжлэх эшлэл: last / this / next week, all visible — this week highlighted. */
export function VerseSection({ verses }: { verses: MemoryVerse[] }) {
  const toast = useToast();
  const { prev, current, next } = pickWeeks(verses);
  if (!current) return null;

  const fullText = `"${current.text}" — ${current.reference}`;

  const onCopy = async () => {
    const ok = await copyText(fullText);
    toast(ok ? 'Эшлэл хуулагдлаа' : 'Хуулж чадсангүй', ok ? 'success' : 'error');
  };

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: current.reference, text: fullText });
      } catch {
        /* user cancelled */
      }
    } else {
      await onCopy();
    }
  };

  return (
    <section className="space-y-3">
      <SectionTitle icon={<BookMarked className="size-5" />} title="Цээжлэх эшлэл" />

      {prev && <SideVerse label="Өнгөрсөн долоо хоногийн эшлэл" verse={prev} />}

      <div className="relative overflow-hidden rounded-3xl bg-cyan-50 p-6 text-cyan-950 ring-2 ring-cyan-600/20">
        <span className="pointer-events-none absolute -right-1 -top-7 select-none font-serif text-[150px] leading-none text-cyan-200/70" aria-hidden>
          “
        </span>
        <p className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700">
          <span className="size-1.5 rounded-full bg-cyan-600" />
          Энэ долоо хоногийн эшлэл · {shortDate(current.week_start)}
        </p>
        <blockquote className="relative mt-3 font-serif text-[21px] leading-relaxed text-slate-900">{current.text}</blockquote>
        <p className="mt-3 text-base font-bold text-cyan-800">— {current.reference}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-700 font-semibold text-white transition active:scale-[0.97]"
          >
            <Copy className="size-5" /> Хуулах
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Хуваалцах"
            className="grid min-h-12 w-14 place-items-center rounded-2xl bg-white text-cyan-800 shadow-soft transition active:scale-95"
          >
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      {next && <SideVerse label="Ирэх долоо хоногийн эшлэл" verse={next} upcoming />}
    </section>
  );
}

function SideVerse({ label, verse, upcoming = false }: { label: string; verse: MemoryVerse; upcoming?: boolean }) {
  return (
    <div className={cn('rounded-3xl bg-white px-5 py-4 shadow-soft', !upcoming && 'opacity-80')}>
      <p className={cn('text-xs font-bold uppercase tracking-wider', upcoming ? 'text-emerald-700' : 'text-slate-400')}>
        {label} · {shortDate(verse.week_start)}
      </p>
      <p className="mt-2 font-serif text-[17px] leading-relaxed text-slate-800">{verse.text}</p>
      <p className="mt-1.5 text-[15px] font-bold text-slate-600">— {verse.reference}</p>
    </div>
  );
}
