import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Node, Rendered } from './model';
import { GAP, HEADING_H, MARGIN, NAVY, PAGE_H, PAGE_W, TEAL, headingStyleFor } from './art';

/*
 * Live preview of the Word export: each page is A4 landscape (297 × 210 mm)
 * at 96 dpi, with the same margins, column gap, fonts, point sizes and page
 * artwork as docx.ts, then scaled to fit the available width. Panels whose
 * content is taller than the page are flagged, since in Word they would spill over.
 */

function NodeView({ n, onNavy }: { n: Node; onNavy: boolean }) {
  if (n.t === 'space') return <div style={{ height: 6 }} />;
  if (n.t === 'image') return <img src={n.url} alt="" className="mx-auto mb-1.5 block w-full object-contain" style={{ maxHeight: n.height ?? 320 }} />;
  if (n.t === 'p')
    return (
      <p
        style={{
          fontSize: `${n.size ?? 9.5}pt`,
          fontWeight: n.bold ? 700 : 400,
          fontStyle: n.italic ? 'italic' : undefined,
          color: n.color ? `#${n.color}` : '#111',
          textAlign: n.align ?? 'left',
          marginBottom: 2,
          lineHeight: 1.2,
          whiteSpace: 'pre-line',
          // on the navy column text sits in white boxes, as in the Word file
          background: onNavy ? '#FFFFFF' : undefined,
        }}
      >
        {n.text}
      </p>
    );
  const cols = Math.max(n.head?.length ?? 0, ...n.rows.map((r) => r.length));
  const widths = n.widths ?? Array.from({ length: cols }, () => 100 / cols);
  const bold = n.boldCols ?? [0];
  const cell = 'border border-[#2E75B6] px-1 py-0.5 align-top';
  return (
    <table className="mb-1 w-full border-collapse bg-white" style={{ fontSize: '8.5pt', lineHeight: 1.2 }}>
      <colgroup>
        {widths.map((w, i) => (
          <col key={i} style={{ width: `${w}%` }} />
        ))}
      </colgroup>
      {n.head && (
        <thead>
          <tr>
            {n.head.map((h, i) => (
              <th key={i} className={cn(cell, 'bg-[#DEEAF6] text-left font-bold')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {n.rows.map((r, ri) => (
          <tr key={ri}>
            {Array.from({ length: cols }, (_, i) => (
              <td key={i} className={cell} style={{ fontWeight: bold.includes(i) ? 700 : 400, whiteSpace: 'pre-line' }}>
                {r[i] ?? ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Same look as renderHeading() in art.ts, which the Word file uses. */
function Heading({ text, panel, first }: { text: string; panel: number; first: boolean }) {
  const style = headingStyleFor(panel, first);
  return (
    <div
      className="mb-1.5 flex items-center overflow-hidden whitespace-nowrap px-2 font-bold uppercase"
      style={{
        height: HEADING_H,
        fontFamily: '"Oswald", "Arial Narrow", Arial, sans-serif',
        fontSize: 25,
        color: style === 'light' ? NAVY : '#FFFFFF',
        background: style === 'band' ? NAVY : undefined,
        borderBottom: `6px solid ${style === 'top' ? 'transparent' : TEAL}`,
      }}
    >
      {text}
    </div>
  );
}

function PanelView({ blocks, label, panel }: { blocks: Rendered[]; label: string; panel: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  // Re-measure whenever the content (or a late-loading image) changes size.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    Array.from(el.children).forEach((c) => ro.observe(c));
    el.querySelectorAll('img').forEach((img) => img.addEventListener('load', check));
    return () => ro.disconnect();
  });

  return (
    <div className="relative min-w-0">
      <div ref={ref} className={cn('h-full overflow-hidden', overflow && 'outline-3 outline-red-500')} style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {blocks.map((b, i) => (
          <div key={i}>
            {b.heading && <Heading text={b.heading} panel={panel} first={i === 0} />}
            {b.nodes.map((n, j) => (
              <NodeView key={j} n={n} onNavy={panel === 1} />
            ))}
          </div>
        ))}
      </div>
      {overflow && (
        <div data-pdf-ignore className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-lg bg-red-600 px-2 py-1.5 text-[13px] font-bold text-white shadow-lg">
          <TriangleAlert className="size-4 shrink-0" /> {label}: багтахгүй байна
        </div>
      )}
    </div>
  );
}

/** Scales a fixed-size A4 page to the container width. */
function Page({
  panels,
  labels,
  title,
  first,
  background,
}: {
  panels: Rendered[][];
  labels: string[];
  title: string;
  first: number;
  background?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / PAGE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <figure>
      <figcaption className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</figcaption>
      <div ref={outer} className="relative w-full overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-300" style={{ height: PAGE_H * scale }}>
        <div
          data-bulletin-page
          className="absolute left-0 top-0 grid origin-top-left bg-white"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${scale})`,
            padding: MARGIN,
            gap: GAP,
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            backgroundImage: background ? `url(${background})` : undefined,
            backgroundSize: '100% 100%',
          }}
        >
          {panels.map((p, i) => (
            <PanelView key={i} blocks={p} label={labels[i]} panel={first + i} />
          ))}
        </div>
      </div>
    </figure>
  );
}

export function BulletinPreview({ panels, labels, art }: { panels: Rendered[][]; labels: string[]; art?: { page1: string; page2: string } }) {
  return (
    <div className="space-y-4">
      <Page title="1-р хуудас · Гадна тал" panels={panels.slice(0, 3)} labels={labels.slice(0, 3)} first={0} background={art?.page1} />
      <Page title="2-р хуудас · Дотор тал" panels={panels.slice(3, 6)} labels={labels.slice(3, 6)} first={3} background={art?.page2} />
      <p className="text-xs text-slate-500">Урьдчилан харах нь Word файлтай ойролцоо. Word дээр үсгийн өргөн бага зэрэг ялгаатай байж болно.</p>
    </div>
  );
}
