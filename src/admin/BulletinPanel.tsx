import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FileDown,
  FileText,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Eye,
  Pencil,
  RotateCcw,
  Type,
  X,
} from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { cn, issueNumber, upcomingSunday } from '../lib/utils';
import { Sheet } from '../components/ui';
import { ImageField } from './ImageField';
import {
  BUILT_IN,
  DEFAULT_PANELS,
  PANEL_LABELS,
  renderBuiltIn,
  renderCustom,
  summarize,
  type BuiltInKind,
  type CustomBlock,
  type Rendered,
} from './bulletin/model';
import { BulletinPreview } from './bulletin/Preview';

const STORAGE_KEY = 'ubc.bulletinLayout.v1';
const isBuiltIn = (id: string): id is BuiltInKind => id in BUILT_IN;

interface Saved {
  panels: string[][];
  custom: CustomBlock[];
}

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (Array.isArray(s.panels) && s.panels.length === 6) {
        // The cover is artwork with a fixed place (panel 3); the QR block is new in later versions.
        const panels = s.panels.map((p) => p.filter((id) => id !== 'cover'));
        panels[2] = ['cover'];
        if (!panels.flat().includes('qr')) panels[5].push('qr');
        return { ...s, panels };
      }
    }
  } catch {
    /* ignore */
  }
  return { panels: DEFAULT_PANELS.map((p) => [...p]), custom: [] };
}

const inputClass =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15';

/**
 * 7 хоногийн мэдээ (printed 3-fold bulletin): this week's data arranged in
 * 6 panels. Blocks can be dragged between panels; extra text/image blocks
 * can be added. Downloads as an editable Word (.docx) file.
 */
export function BulletinPanel() {
  const { result } = useBulletin();
  const toast = useToast();
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [date, setDate] = useState(upcomingSunday());
  const [number, setNumber] = useState(() => issueNumber(upcomingSunday()));
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ panel: number; index: number } | null>(null);
  const [editing, setEditing] = useState<CustomBlock | null>(null);
  const [busy, setBusy] = useState<'docx' | 'pdf' | null>(null);
  const [view, setView] = useState<'edit' | 'preview'>('edit');

  const persist = (next: Saved) => {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const [siteUrl, setSiteUrl] = useState(() => window.location.origin);
  const [qr, setQr] = useState<string>();
  const [art, setArt] = useState<{ page1: string; page2: string }>();

  // QR code for page 2.
  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then(({ toDataURL }) => toDataURL(siteUrl || ' ', { margin: 1, width: 480, color: { dark: '#173A5E', light: '#FFFFFF' } }))
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(undefined));
    return () => {
      alive = false;
    };
  }, [siteUrl]);

  // Page artwork (cover shows the issue number, date and pastor) — redrawn shortly after edits.
  const churchInfo = result?.data.churchInfo;
  useEffect(() => {
    if (!churchInfo) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      const { renderPage1, renderPage2 } = await import('./bulletin/art');
      const [page1, page2] = await Promise.all([renderPage1(churchInfo, { number, date }), renderPage2()]);
      if (alive) setArt({ page1, page2 });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [churchInfo, number, date]);

  const issue = { number, date, qr, siteUrl };
  const render = (id: string): Rendered | null => {
    if (!result) return null;
    if (isBuiltIn(id)) return renderBuiltIn(id, result.data, issue);
    const c = saved.custom.find((b) => b.id === id);
    return c ? renderCustom(c) : null;
  };
  const titleOf = (id: string) => (isBuiltIn(id) ? BUILT_IN[id] : saved.custom.find((b) => b.id === id)?.title || 'Нэмэлт блок');

  const placed = useMemo(() => new Set(saved.panels.flat()), [saved.panels]);
  const pool = [...(Object.keys(BUILT_IN) as BuiltInKind[]).filter((k) => !placed.has(k)), ...saved.custom.map((c) => c.id).filter((id) => !placed.has(id))];

  /** Moves a block to a panel/position (panel -1 = back to the unused pool). */
  const move = (id: string, panel: number, index?: number) => {
    // The cover is fixed artwork on panel 3, and nothing else can go there.
    if (id === 'cover' || panel === 2) return;
    const panels = saved.panels.map((p) => p.filter((x) => x !== id));
    if (panel >= 0) {
      const target = panels[panel];
      target.splice(index ?? target.length, 0, id);
    }
    persist({ ...saved, panels });
  };

  const where = (id: string) => {
    const panel = saved.panels.findIndex((p) => p.includes(id));
    return { panel, index: panel >= 0 ? saved.panels[panel].indexOf(id) : -1 };
  };

  /* ---------- drag & drop (desktop); arrow buttons cover touch screens */
  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };
  const onDropTo = (e: DragEvent, panel: number, index?: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (id) move(id, panel, index);
    setDragId(null);
    setOver(null);
  };

  /* ---------- custom blocks */
  const newBlock = (kind: CustomBlock['kind']) =>
    setEditing({ id: `c${Date.now().toString(36)}`, kind, title: kind === 'image' ? '' : 'Мэдээлэл', body: '', imageUrl: '' });

  const saveBlock = () => {
    if (!editing) return;
    const exists = saved.custom.some((b) => b.id === editing.id);
    const custom = exists ? saved.custom.map((b) => (b.id === editing.id ? editing : b)) : [...saved.custom, editing];
    const panels = exists ? saved.panels : saved.panels.map((p, i) => (i === 5 ? [...p, editing.id] : p));
    persist({ panels, custom });
    setEditing(null);
  };

  const deleteBlock = (id: string) => {
    if (!window.confirm('Энэ нэмэлт блокийг устгах уу?')) return;
    persist({ panels: saved.panels.map((p) => p.filter((x) => x !== id)), custom: saved.custom.filter((b) => b.id !== id) });
  };

  const reset = () => {
    if (!window.confirm('Блокуудын байрлалыг анхны загвар руу буцаах уу? (Нэмэлт блокууд хадгалагдана)')) return;
    persist({ ...saved, panels: DEFAULT_PANELS.map((p) => [...p]) });
  };

  const download = async (kind: 'docx' | 'pdf') => {
    setBusy(kind);
    try {
      if (kind === 'pdf') {
        const { downloadBulletinPdf } = await import('./bulletin/pdf');
        await downloadBulletinPdf(`Чуулганы-мэдээ-№${number}-${date}.pdf`);
        toast('PDF файл татагдлаа');
        return;
      }
      const { downloadBulletinDocx } = await import('./bulletin/docx');
      const { renderPage1, renderPage2 } = await import('./bulletin/art');
      const pages = art ?? { page1: await renderPage1(result!.data.churchInfo, { number, date }), page2: await renderPage2() };
      await downloadBulletinDocx(renderedPanels, pages, `Чуулганы-мэдээ-№${number}-${date}.docx`);
      toast('Word файл татагдлаа');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Файл үүсгэж чадсангүй', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!result) return null;

  const renderedPanels = saved.panels.map((ids) => ids.map(render).filter((r): r is Rendered => !!r));

  // Plain render functions (not components) so a drag in progress isn't remounted on re-render.
  const chip = (id: string) => {
    const r = render(id);
    const { panel, index } = where(id);
    const custom = !isBuiltIn(id);
    const iconBtn = 'grid size-8 place-items-center rounded-lg text-slate-500 active:bg-slate-100 disabled:opacity-25';
    return (
      <div
        key={id}
        draggable
        onDragStart={(e) => onDragStart(e, id)}
        onDragEnd={() => {
          setDragId(null);
          setOver(null);
        }}
        onDragOver={(e) => {
          if (panel < 0) return;
          e.preventDefault();
          e.stopPropagation();
          setOver({ panel, index });
        }}
        onDrop={(e) => {
          e.stopPropagation();
          if (panel >= 0) onDropTo(e, panel, index);
        }}
        className={cn(
          'rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 transition',
          dragId === id && 'opacity-40',
          over && over.panel === panel && over.index === index && dragId !== id && 'ring-2 ring-cyan-500',
        )}
      >
        <div className="flex items-start gap-1.5">
          <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-slate-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              {custom && (saved.custom.find((b) => b.id === id)?.kind === 'image' ? <ImagePlus className="size-3.5 text-violet-600" /> : <Type className="size-3.5 text-violet-600" />)}
              <span className="truncate">{titleOf(id)}</span>
            </p>
            {r && <p className="truncate text-xs text-slate-500">{summarize(r)}</p>}
          </div>
          {custom && (
            <button type="button" onClick={() => setEditing(saved.custom.find((b) => b.id === id) ?? null)} aria-label="Засах" className={iconBtn}>
              <Pencil className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => (panel >= 0 ? move(id, -1) : custom ? deleteBlock(id) : undefined)}
            aria-label={panel >= 0 ? 'Хасах' : 'Устгах'}
            className={cn(iconBtn, panel < 0 && !custom && 'hidden')}
          >
            <X className="size-4" />
          </button>
        </div>
        {/* touch-friendly movement */}
        <div className="mt-1 flex items-center gap-0.5 pl-5">
          {panel >= 0 ? (
            <>
              <button type="button" disabled={index === 0} onClick={() => move(id, panel, index - 1)} aria-label="Дээш" className={iconBtn}>
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" disabled={index === saved.panels[panel].length - 1} onClick={() => move(id, panel, index + 1)} aria-label="Доош" className={iconBtn}>
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" disabled={panel === 0} onClick={() => move(id, panel - 1)} aria-label="Өмнөх самбар" className={iconBtn}>
                <ArrowLeft className="size-3.5" />
              </button>
              <button type="button" disabled={panel === 5} onClick={() => move(id, panel + 1)} aria-label="Дараагийн самбар" className={iconBtn}>
                <ArrowRight className="size-3.5" />
              </button>
            </>
          ) : (
            <select
              value=""
              onChange={(e) => e.target.value && move(id, Number(e.target.value))}
              aria-label="Самбарт нэмэх"
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-cyan-800"
            >
              <option value="">＋ Самбарт нэмэх…</option>
              {PANEL_LABELS.map((l, i) => (
                <option key={l} value={i}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  };

  const panel = (i: number) => (
    <div
      key={i}
      onDragOver={(e) => {
        e.preventDefault();
        setOver({ panel: i, index: saved.panels[i].length });
      }}
      onDrop={(e) => onDropTo(e, i)}
      className={cn(
        'flex min-h-40 flex-col gap-2 rounded-2xl border-2 border-dashed p-2 transition',
        i === 2 ? 'border-cyan-300 bg-cyan-50/50' : 'border-slate-200 bg-slate-50',
        over?.panel === i && over.index === saved.panels[i].length && 'border-cyan-500 bg-cyan-50',
      )}
    >
      <p className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">{PANEL_LABELS[i]}</p>
      {saved.panels[i].map((id) => (
        chip(id)
      ))}
      {saved.panels[i].length === 0 && <p className="px-1 text-xs text-slate-400">Блок чирж оруулна уу</p>}
    </div>
  );

  return (
    // Breaks out of the narrow admin column on wide screens to make room for the preview.
    <div className="lg:relative lg:left-1/2 lg:w-[min(1400px,calc(100vw-2rem))] lg:-translate-x-1/2">
      <div role="tablist" className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/70 p-1 lg:hidden">
        {(['edit', 'preview'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn('flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition', view === v ? 'bg-white text-cyan-800 shadow-sm' : 'text-slate-600')}
          >
            {v === 'edit' ? <Pencil className="size-4" /> : <Eye className="size-4" />} {v === 'edit' ? 'Засах' : 'Харах'}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className={cn('space-y-4', view === 'preview' && 'hidden lg:block')}>
      {/* Issue */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-soft">
        <label className="text-sm font-semibold text-slate-600">
          Дугаар №
          <input type="number" inputMode="numeric" value={number} onChange={(e) => setNumber(Number(e.target.value) || 0)} className={cn(inputClass, 'mt-1')} />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Ням гараг
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (!e.target.value) return;
              setDate(e.target.value);
              setNumber(issueNumber(e.target.value));
            }}
            className={cn(inputClass, 'mt-1')}
          />
        </label>
        <label className="col-span-2 text-sm font-semibold text-slate-600">
          QR холбоос
          <input type="url" inputMode="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value.trim())} className={cn(inputClass, 'mt-1')} />
        </label>
      </div>

      <p className="px-1 text-sm text-slate-500">
        Мэдээлэл апп-аас автоматаар орно. Блокуудыг чирж (утсан дээр ← → ↑ ↓ товчоор) байрлалыг нь сольж болно.
      </p>

      <section>
        <h3 className="mb-2 px-1 text-sm font-bold text-slate-700">1-р хуудас · Гадна тал</h3>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-1">
          {[0, 1, 2].map((i) => (
            panel(i)
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 px-1 text-sm font-bold text-slate-700">2-р хуудас · Дотор тал</h3>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-1">
          {[3, 4, 5].map((i) => (
            panel(i)
          ))}
        </div>
      </section>

      {/* Unused / extra blocks */}
      <section
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropTo(e, -1)}
        className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-3"
      >
        <h3 className="mb-2 text-sm font-bold text-slate-700">Нэмэлт блокууд</h3>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => newBlock('text')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 active:scale-95">
            <Type className="size-4" /> Текст нэмэх
          </button>
          <button type="button" onClick={() => newBlock('image')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 active:scale-95">
            <ImagePlus className="size-4" /> Зураг нэмэх
          </button>
        </div>
        {pool.length === 0 ? (
          <p className="text-xs text-slate-400">Хасагдсан блок энд ирнэ. Энд чирж оруулбал мэдээнээс хасагдана.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-1">
            {pool.map((id) => (
              chip(id)
            ))}
          </div>
        )}
      </section>

      <button type="button" onClick={reset} className="mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-500 active:bg-slate-100">
        <RotateCcw className="size-4" /> Анхны байрлал руу буцаах
      </button>

        </div>

        {/* Live preview: beside the editor on wide screens, its own tab on phones */}
        <div className={cn('lg:sticky lg:top-20', view === 'edit' && 'hidden lg:block')}>
          <BulletinPreview panels={renderedPanels} labels={PANEL_LABELS} art={art} />
        </div>
      </div>

      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-white p-2 pl-4 shadow-lg ring-1 ring-slate-200">
        <p className="min-w-0 flex-1 truncate text-sm text-slate-500">№{number} · 2 хуудас, 3 нугалаас</p>
        <button
          type="button"
          onClick={() => download('pdf')}
          disabled={!!busy || !art}
          aria-label="PDF татах"
          className="flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-3.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy === 'pdf' ? <LoaderCircle className="size-5 animate-spin" /> : <FileDown className="size-5" />} .pdf
        </button>
        <button
          type="button"
          onClick={() => download('docx')}
          disabled={!!busy}
          aria-label="Word татах"
          className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-3.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy === 'docx' ? <LoaderCircle className="size-5 animate-spin" /> : <FileText className="size-5" />} .docx
        </button>
      </div>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.kind === 'image' ? 'Зураг блок' : 'Текст блок'}
        footer={
          <button type="button" onClick={saveBlock} className="min-h-12 w-full rounded-xl bg-cyan-700 font-semibold text-white active:scale-[0.98]">
            Хадгалах
          </button>
        }
      >
        {editing && (
          <div className="space-y-4">
            <label className="block text-[15px] font-semibold text-slate-700">
              Гарчиг
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="ж: Залбирлын сэдэв" className={cn(inputClass, 'mt-1.5')} />
            </label>
            {editing.kind === 'text' ? (
              <label className="block text-[15px] font-semibold text-slate-700">
                Агуулга
                <textarea
                  rows={8}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  className={cn(inputClass, 'mt-1.5 py-3')}
                />
              </label>
            ) : (
              <ImageField id="bulletin-img" folder="bulletin" value={editing.imageUrl} onChange={(url) => setEditing({ ...editing, imageUrl: url })} />
            )}
            <p className="text-sm text-slate-500">Шинэ блок 6-р самбарт нэмэгдэнэ. Дараа нь хүссэн газар руугаа зөөнө.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
