import type { MonthlyPlan, PlanCategory } from '../types/database';
import { addDays, dotDate, parseISODate, todayISO } from './utils';
import { categoryRank, isMultiDay } from '../components/MonthCalendar';
import { isIOS } from './pwaInstall';

/*
 * Printable month calendar (A4 portrait), styled after the church's printed
 * «…САРЫН ТӨЛӨВЛӨГӨӨ» sheet. Drawn on a canvas (so Cyrillic text renders with
 * the app's own font, no PDF font embedding needed), then placed into a PDF.
 */

const W = 1654; // A4 at 200 dpi
const MARGIN = 64;
const GRID_W = W - MARGIN * 2;
// System fonts render bold reliably on canvas (the variable web font does not everywhere)
// and include the Mongolian Ө / Ү.
const FONT = 'Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif';

const HEAD = ['НЯМ', 'ДАВАА', 'МЯГМАР', 'ЛХАГВА', 'ПҮРЭВ', 'БААСАН', 'БЯМБА'];
// Sunday and Saturday carry the most events, so they get wider columns (like the printed sheet).
const WEIGHTS = [1.9, 1, 1.12, 1.12, 1.12, 1.12, 1.7];

const TEXT_COLOR: Record<PlanCategory | 'none', string> = {
  seminar: '#3730a3',
  word: '#c62828',
  school: '#1565c0',
  fellowship: '#1b5e20',
  none: '#111827',
};
const BAR_COLOR: Record<PlanCategory | 'none', { fill: string; stroke: string; text: string }> = {
  seminar: { fill: '#c5e1a5', stroke: '#7cb342', text: '#1b2e0b' },
  word: { fill: '#ffcdd2', stroke: '#e57373', text: '#5d0f0f' },
  school: { fill: '#bbdefb', stroke: '#64b5f6', text: '#0d2c4d' },
  fellowship: { fill: '#e1bee7', stroke: '#ba68c8', text: '#3b0d45' },
  none: { fill: '#e5e7eb', stroke: '#9ca3af', text: '#111827' },
};

const DAY_NUM = 44;
const LINE = 30; // event line height
const EVENT_FONT = `700 23px ${FONT}`;
const BAR_H = 46;
const BAR_GAP = 10;
const PAD = 12;

const cat = (p: MonthlyPlan) => p.category ?? 'none';

/** Word-wraps text to a width; very long words are broken by character. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxW) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    let chunk = '';
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxW && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else chunk += ch;
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines;
}

/** "18:00 – ҮГ (Билгүүн п)" */
function eventLabel(p: MonthlyPlan): string {
  const head = p.time ? `${p.time.split(/[–-]/)[0].trim()} – ${p.title}` : p.title;
  return p.speaker ? `${head} (${p.speaker})` : head;
}

function barLabel(p: MonthlyPlan): string {
  const range = `${dotDate(p.event_date)}–${dotDate(p.end_date!)}`;
  return `${p.title} (${range}${p.speaker ? `, ${p.speaker}` : ''})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h); // Safari < 16
}

interface Bar {
  plan: MonthlyPlan;
  from: number;
  to: number;
  lane: number;
}

function weekBars(multi: MonthlyPlan[], week: string[]): Bar[] {
  const [first, last] = [week[0], week[6]];
  const bars = multi
    .filter((p) => p.event_date <= last && p.end_date! >= first)
    .map((p) => ({ plan: p, from: Math.max(0, week.indexOf(p.event_date)), to: p.end_date! > last ? 6 : week.indexOf(p.end_date!), lane: 0 }))
    .sort((a, b) => a.from - b.from || a.plan.event_date.localeCompare(b.plan.event_date));
  const ends: number[] = [];
  for (const b of bars) {
    let lane = ends.findIndex((e) => e < b.from);
    if (lane < 0) lane = ends.length;
    ends[lane] = b.to;
    b.lane = lane;
  }
  return bars;
}

/** Draws the month and returns the canvas. */
export async function renderMonthCanvas(month: string, allPlans: MonthlyPlan[], churchName: string): Promise<HTMLCanvasElement> {
  // Make sure the glyphs are ready before drawing (no-op for system fonts).
  await Promise.all([
    document.fonts.load(`800 80px ${FONT}`, 'ӨҮЧУУЛГАН'),
    document.fonts.load(EVENT_FONT, 'ӨҮабв'),
  ]).catch(() => {});

  const first = parseISODate(`${month}-01`);
  const monthNo = first.getMonth() + 1;
  const start = addDays(`${month}-01`, -first.getDay());
  const weeksCount = Math.ceil((first.getDay() + new Date(first.getFullYear(), monthNo, 0).getDate()) / 7);
  const weeks = Array.from({ length: weeksCount }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));

  const lastDay = weeks.at(-1)![6];
  const plans = allPlans.filter((p) => p.event_date <= lastDay && (p.end_date ?? p.event_date) >= start);
  const multi = plans.filter(isMultiDay);
  const singles = plans
    .filter((p) => !isMultiDay(p))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || categoryRank(a.category) - categoryRank(b.category));

  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  const colW = WEIGHTS.map((w) => (w / total) * GRID_W);
  const colX = colW.map((_, i) => MARGIN + colW.slice(0, i).reduce((a, b) => a + b, 0));

  // ---- measure
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = EVENT_FONT;
  const layout = weeks.map((week) => {
    const bars = weekBars(multi, week);
    const lanes = bars.reduce((n, b) => Math.max(n, b.lane + 1), 0);
    const cells = week.map((date, col) => {
      if (!date.startsWith(month)) return [] as { text: string[]; color: string }[];
      return singles
        .filter((p) => p.event_date === date)
        .map((p) => ({ text: wrap(measure, eventLabel(p), colW[col] - PAD * 2), color: TEXT_COLOR[cat(p)] }));
    });
    const contentH = Math.max(...cells.map((c) => c.reduce((h, e) => h + e.text.length * LINE + 6, 0)));
    const barsH = lanes ? lanes * (BAR_H + BAR_GAP) + BAR_GAP : 0;
    return { week, bars, cells, height: Math.max(200, PAD + DAY_NUM + 10 + contentH + barsH + PAD) };
  });

  const TITLE_TOP = 70;
  const titleSize = 92;
  const headerY = TITLE_TOP + titleSize * 2 + 110;
  const HEADER_H = 64;
  const gridH = layout.reduce((h, r) => h + r.height, 0);
  const H = Math.max(Math.round(W * 1.4142), headerY + HEADER_H + gridH + 90);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'top';

  // ---- title
  const short = churchName.trim().split(/\s+/)[0].toUpperCase();
  ctx.fillStyle = '#000000';
  ctx.font = `800 ${titleSize}px ${FONT}`;
  ctx.textAlign = 'center';
  wrap(ctx, `${short} ЧУУЛГАН ${monthNo}-Р САРЫН ТӨЛӨВЛӨГӨӨ`, GRID_W - 40).forEach((line, i) =>
    ctx.fillText(line, W / 2, TITLE_TOP + i * (titleSize + 14)),
  );
  ctx.textAlign = 'right';
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`Хэвлэсэн огноо: ${todayISO().replaceAll('-', '.')}`, W - MARGIN, headerY - 44);

  // ---- weekday header
  HEAD.forEach((label, i) => {
    const [fill, color] = i === 0 ? ['#e10600', '#ffffff'] : i === 6 ? ['#1565c0', '#ffffff'] : ['#ffff00', '#000000'];
    ctx.fillStyle = fill;
    ctx.fillRect(colX[i], headerY, colW[i], HEADER_H);
    ctx.fillStyle = color;
    ctx.font = `800 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, colX[i] + colW[i] / 2, headerY + 18);
  });

  // ---- grid lines (before the text, so seminar bars sit on top of them)
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 2.5;
  let gy = headerY;
  const rows = [HEADER_H, ...layout.map((r) => r.height)];
  ctx.strokeRect(MARGIN, headerY, GRID_W, rows.reduce((a, b) => a + b, 0));
  for (const h of rows) {
    gy += h;
    ctx.beginPath();
    ctx.moveTo(MARGIN, gy);
    ctx.lineTo(MARGIN + GRID_W, gy);
    ctx.stroke();
  }
  colX.slice(1).forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, headerY);
    ctx.lineTo(x, headerY + rows.reduce((a, b) => a + b, 0));
    ctx.stroke();
  });

  // ---- weeks
  let y = headerY + HEADER_H;
  for (const row of layout) {
    row.week.forEach((date, col) => {
      const inMonth = date.startsWith(month);
      if (!inMonth) return;
      ctx.textAlign = 'left';
      ctx.font = `800 ${DAY_NUM}px ${FONT}`;
      ctx.fillStyle = col === 0 ? '#c62828' : col === 6 ? '#1565c0' : '#111111';
      ctx.fillText(String(parseISODate(date).getDate()), colX[col] + PAD, y + PAD);

      let ty = y + PAD + DAY_NUM + 10;
      ctx.font = EVENT_FONT;
      for (const ev of row.cells[col]) {
        ctx.fillStyle = ev.color;
        for (const line of ev.text) {
          ctx.fillText(line, colX[col] + PAD, ty);
          ty += LINE;
        }
        ty += 6;
      }
    });

    // bars sit at the bottom of the week row
    const lanes = row.bars.reduce((n, b) => Math.max(n, b.lane + 1), 0);
    const barsTop = y + row.height - lanes * (BAR_H + BAR_GAP) - PAD;
    for (const b of row.bars) {
      const c = BAR_COLOR[cat(b.plan)];
      const x0 = colX[b.from] + 14;
      const x1 = colX[b.to] + colW[b.to] - 14;
      const by = barsTop + b.lane * (BAR_H + BAR_GAP);
      roundRect(ctx, x0, by, x1 - x0, BAR_H, 6);
      ctx.fillStyle = c.fill;
      ctx.fill();
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.font = `700 24px ${FONT}`;
      ctx.textAlign = 'center';
      const label = wrap(ctx, barLabel(b.plan), x1 - x0 - 20)[0];
      ctx.fillText(label, (x0 + x1) / 2, by + 11);
    }
    y += row.height;
  }

  // ---- legend / footer
  const legend: [string, string][] = [
    ['Семинар', '#7cb342'],
    ['Үг', TEXT_COLOR.word],
    ['Чуулганы сургууль', TEXT_COLOR.school],
    ['Нөхөрлөл', TEXT_COLOR.fellowship],
  ];
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'left';
  let lx = MARGIN;
  const ly = y + 30;
  for (const [label, color] of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly + 4, 18, 18);
    ctx.fillStyle = '#333333';
    ctx.fillText(label, lx + 26, ly);
    lx += 26 + ctx.measureText(label).width + 34;
  }

  return canvas;
}

/** Builds the A4 PDF and saves it (iPhone: opens the share sheet → «Файлд хадгалах»). */
export async function downloadMonthPdf(month: string, plans: MonthlyPlan[], churchName: string): Promise<void> {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), renderMonthCanvas(month, plans, churchName)]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const pageW = 210;
  const pageH = 297;
  // Fit the drawing on one page, keeping proportions.
  const scale = Math.min(pageW / canvas.width, pageH / canvas.height);
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (pageW - w) / 2, 0, w, h);

  const filename = `Төлөвлөгөө-${month}.pdf`;
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // user closed the sheet
    }
  }
  pdf.save(filename);
}

