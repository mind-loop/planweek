import '@fontsource/oswald/700.css';
import '@fontsource/caveat/600.css';
import type { ChurchInfo } from '../../types/database';

/*
 * Fixed artwork of the printed bulletin (matches Template.pdf), drawn on canvas:
 *  - page 1 background: light left third, navy middle third, full cover on the right third
 *  - page 2 background: navy band with teal stripe across the top, faint crosses
 *  - section headings in the condensed display font
 * The Word file places the backgrounds behind the (editable) text.
 */

export const PAGE_W = 1123; // A4 landscape at 96 dpi
export const PAGE_H = 794;
export const MARGIN = 38; // 10 mm
export const GAP = 38;
export const COL_W = (PAGE_W - MARGIN * 2 - GAP * 2) / 3;
export const THIRD = PAGE_W / 3;

export const NAVY = '#173A5E';
export const TEAL = '#4FB6CB';
const PALE = '#E3F2F7';

const HEADING_FONT = '"Oswald", "Arial Narrow", Arial, sans-serif';
const SCRIPT_FONT = '"Caveat", "Segoe Print", cursive';
const TEXT_FONT = 'Arial, Helvetica, sans-serif';

/**
 * light = light page (navy text), onNavy = on the navy column (white text),
 * band = own navy band (page 2), top = first heading of a page-2 panel: only the
 * white text, sitting on the page's top band, so its teal line is the page's
 * one continuous stripe.
 */
export type HeadingStyle = 'light' | 'onNavy' | 'band' | 'top';
export const headingStyleFor = (panel: number, first: boolean): HeadingStyle =>
  panel === 0 ? 'light' : panel === 1 ? 'onNavy' : first && panel >= 3 ? 'top' : 'band';
export const HEADING_H = 40;
const BAR = 6;

async function ensureFonts() {
  await Promise.all([
    document.fonts.load(`700 28px ${HEADING_FONT}`, 'ӨҮАБВ'),
    document.fonts.load(`600 30px ${SCRIPT_FONT}`, 'Есүс өөд'),
  ]).catch(() => {});
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvas(w: number, h: number, scale: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Зураг зурах санах ой хүрэлцсэнгүй. Хуудсаа дахин ачаална уу.');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';
  return { c, ctx };
}

/**
 * Encodes the canvas, then shrinks it to 0×0 so its pixels are released right
 * away: iPhone Safari caps the total canvas memory of a page (a few hundred MB)
 * and only frees canvases on garbage collection, so redrawing the artwork on
 * every edit would otherwise run out and break all drawing.
 */
export function flush(c: HTMLCanvasElement, type: string, quality?: number): string {
  const url = c.toDataURL(type, quality);
  c.width = c.height = 0;
  return url;
}

function cross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  const t = size * 0.16;
  ctx.fillRect(x - t / 2, y, t, size); // upright
  ctx.fillRect(x - size * 0.36, y + size * 0.26, size * 0.72, t); // arm
}

/** Soft white clouds across the cover's sky. */
function clouds(ctx: CanvasRenderingContext2D, x0: number, w: number) {
  // each cloud = a few overlapping soft radial puffs, flattened vertically
  const puffs: [number, number, number][] = [
    [0.1, 40, 40], [0.22, 34, 34], [0.34, 44, 30], [0.7, 26, 36], [0.85, 40, 42],
    [0.0, 300, 50], [0.15, 314, 40], [0.7, 330, 56], [0.88, 318, 44], [0.45, 360, 46],
  ];
  ctx.save();
  ctx.scale(1, 0.4);
  for (const [fx, y, r] of puffs) {
    const cx = x0 + fx * w;
    const cy = y / 0.4;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.4);
    g.addColorStop(0, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8);
  }
  ctx.restore();
}

/** Cross with a teal extruded side, as on the printed cover. */
function cross3d(ctx: CanvasRenderingContext2D, cx: number, top: number, size: number) {
  const t = size * 0.19; // bar thickness
  const parts: [number, number, number, number][] = [
    [cx - t / 2, top, t, size], // upright
    [cx - size * 0.32, top + size * 0.24, size * 0.64, t], // arm
  ];
  const depth = 14;
  for (let i = depth; i > 0; i--) {
    ctx.fillStyle = i > depth / 2 ? '#3FA9BE' : '#6CC6D4';
    for (const [x, y, pw, ph] of parts) ctx.fillRect(x + i, y - i * 0.75, pw, ph);
  }
  ctx.fillStyle = '#EEF9FB';
  for (const [x, y, pw, ph] of parts) ctx.fillRect(x, y, pw, ph);
}

/** Heading as a transparent PNG sized to one column. */
export async function renderHeading(text: string, style: HeadingStyle, scale = 3): Promise<string> {
  await ensureFonts();
  const { c, ctx } = canvas(COL_W, HEADING_H, scale);
  if (style === 'band') {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, COL_W, HEADING_H - BAR);
  }
  if (style !== 'top') {
    ctx.fillStyle = TEAL;
    ctx.fillRect(0, HEADING_H - BAR, COL_W, BAR);
  }
  ctx.fillStyle = style === 'light' ? NAVY : '#FFFFFF';
  ctx.font = `700 25px ${HEADING_FONT}`;
  let size = 25;
  while (ctx.measureText(text.toUpperCase()).width > COL_W - 16 && size > 14) {
    size -= 1;
    ctx.font = `700 ${size}px ${HEADING_FONT}`;
  }
  ctx.fillText(text.toUpperCase(), 8, (HEADING_H - BAR - size * 1.2) / 2 + 1);
  return flush(c, 'image/png');
}

/** Page 1: outside of the sheet, with the full cover on the right third. */
export async function renderPage1(info: ChurchInfo, issue: { number: number; date: string }, scale = 2.5): Promise<string> {
  await ensureFonts();
  const { c, ctx } = canvas(PAGE_W, PAGE_H, scale);

  // left third: white with a pale curve
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = '#F1F8FB';
  ctx.beginPath();
  ctx.arc(120, 560, 210, 0, Math.PI * 2);
  ctx.fill();

  // middle third: navy column
  ctx.fillStyle = NAVY;
  ctx.fillRect(THIRD, 0, THIRD, PAGE_H);

  // right third: cover — sky with clouds and a 3D cross, title, church photo
  // rising from the bottom and blending into the sky, footer with church name and pastor
  const x0 = THIRD * 2;
  const w = THIRD;
  const FOOT_H = 66;
  const fy = PAGE_H - FOOT_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, 0, w, PAGE_H);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, 0, 0, 470);
  sky.addColorStop(0, '#4E98D2');
  sky.addColorStop(0.45, '#9FCBEA');
  sky.addColorStop(1, '#E4F1F8');
  ctx.fillStyle = sky;
  ctx.fillRect(x0, 0, w, fy);
  clouds(ctx, x0, w);

  // photo, width-fitted, bottom on the footer; its top fades into the sky
  try {
    const img = await loadImage('/church.jpg');
    const top = 400;
    const h = fy - top;
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s;
    const sh = h / s;
    const layer = document.createElement('canvas');
    layer.width = Math.round(w * scale);
    layer.height = Math.round(h * scale);
    const lctx = layer.getContext('2d')!;
    lctx.imageSmoothingQuality = 'high';
    // keep the bottom of the photo (the building), crop the top
    lctx.drawImage(img, (img.width - sw) / 2, img.height - sh, sw, sh, 0, 0, layer.width, layer.height);
    const fade = lctx.createLinearGradient(0, 0, 0, layer.height * 0.5);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    lctx.globalCompositeOperation = 'destination-in';
    lctx.fillStyle = fade;
    lctx.fillRect(0, 0, layer.width, layer.height);
    ctx.drawImage(layer, x0, top, w, h);
    layer.width = layer.height = 0; // free it now (iOS caps canvas memory)
  } catch {
    /* sky only */
  }

  ctx.fillStyle = NAVY;
  ctx.font = `400 13px ${TEXT_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`№ ${issue.number}`, x0 + 10, 10);
  ctx.textAlign = 'right';
  ctx.fillText(issue.date.replaceAll('-', '.'), PAGE_W - 10, 10);

  cross3d(ctx, x0 + 304, 58, 150);

  // title: two lines sharing a right edge, each stretched to its width
  const right = x0 + 280;
  const line = (text: string, width: number, y: number) => {
    let size = 60;
    ctx.font = `700 ${size}px ${HEADING_FONT}`;
    size = (size * width) / ctx.measureText(text).width;
    ctx.font = `700 ${size}px ${HEADING_FONT}`;
    ctx.fillText(text, right, y);
  };
  ctx.fillStyle = NAVY;
  ctx.textAlign = 'right';
  line('ЧУУЛГАНЫ', 200, 118);
  line('МЭДЭЭ', 152, 198);
  ctx.fillStyle = TEAL;
  ctx.fillRect(right - 200, 205, 200 - 152 - 10, 7);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#3E9DB3';
  ctx.font = `600 31px ${SCRIPT_FONT}`;
  ctx.fillText('“Есүс өөд харцгаая”', x0 + 168, 258);
  ctx.font = `600 13px ${SCRIPT_FONT}`;
  ctx.fillText('Еврей 12:2', x0 + 338, 278);

  // footer
  const nameW = 232;
  ctx.fillStyle = NAVY;
  ctx.fillRect(x0, fy, nameW, FOOT_H);
  ctx.fillStyle = '#DDF0F3';
  ctx.fillRect(x0 + nameW, fy, w - nameW, FOOT_H);
  const textX = x0 + 12;
  const room = x0 + nameW - 8 - textX;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 14px ${SCRIPT_FONT}`;
  ctx.font = `600 ${Math.min(14, (14 * room) / ctx.measureText('Христэд Итгэгч Баптист Сүмүүдийн Холбоо').width)}px ${SCRIPT_FONT}`;
  ctx.fillText('Христэд Итгэгч Баптист Сүмүүдийн Холбоо', textX, fy + 12);
  const church = info.church_name.toUpperCase();
  ctx.font = `700 22px ${HEADING_FONT}`;
  ctx.font = `700 ${Math.min(22, (22 * room) / ctx.measureText(church).width)}px ${HEADING_FONT}`;
  ctx.fillText(church, textX, fy + 30);

  ctx.fillStyle = '#10243A';
  ctx.font = `700 13px ${TEXT_FONT}`;
  ctx.fillText('Пастор:', x0 + nameW + 10, fy + 15);
  ctx.font = `400 13px ${TEXT_FONT}`;
  const named = (info.pastor ?? '').replace(/^\s*пастор[:\s]*/i, '').trim();
  const pastor = /\p{L}/u.test(named) ? named : 'Ж.Билгүүн';
  ctx.fillText(pastor, x0 + nameW + 22, fy + 35);
  ctx.restore();

  return flush(c, 'image/jpeg', 0.9);
}

/** Page 2: inside of the sheet. */
const page2Cache = new Map<number, string>();

/** Page 2 never changes, so it is drawn once per scale. */
export async function renderPage2(scale = 2): Promise<string> {
  let url = page2Cache.get(scale);
  if (!url) page2Cache.set(scale, (url = drawPage2(scale)));
  return url;
}

function drawPage2(scale: number): string {
  const { c, ctx } = canvas(PAGE_W, PAGE_H, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  // soft shapes
  ctx.fillStyle = '#F1F8FB';
  ctx.beginPath();
  ctx.arc(380, 470, 160, 0, Math.PI * 2);
  ctx.arc(720, 90, 120, 0, Math.PI * 2);
  ctx.fill();
  // top band — headings of the first blocks sit right on it
  const band = MARGIN + HEADING_H - BAR;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, PAGE_W, band);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, band, PAGE_W, BAR);
  // faint crosses bottom-right
  cross(ctx, 1040, 470, 260, PALE);
  cross(ctx, 930, 640, 150, '#EEF7FA');
  return flush(c, 'image/jpeg', 0.92);
}
