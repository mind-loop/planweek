import type { BulletinData, MemoryVerse, MonthlyPlan } from '../../types/database';
import { DUTY_META, DUTY_ORDER, dutyWeeks } from '../../lib/duty';
import { activeCleaning } from '../../lib/cleaning';
import { WEEKLY_PROGRAM } from '../../lib/recurring';
import { categoryRank, isMultiDay } from '../../components/MonthCalendar';
import { WEEKDAYS_MN, addDays, dotDate, parseISODate, shortDate, splitList, weekdayShort } from '../../lib/utils';

/* -------------------------------------------------------------------------
 * Weekly printed bulletin (3-fold, 2 × A4 landscape = 6 panels).
 * Each block turns app data into neutral content nodes; the editor previews
 * them and docx.ts turns them into a Word document.
 * ---------------------------------------------------------------------- */

export type Node =
  | { t: 'p'; text: string; bold?: boolean; size?: number; color?: string; align?: 'left' | 'center' | 'right'; italic?: boolean }
  | { t: 'table'; head?: string[]; rows: string[][]; widths?: number[]; /** Bold columns (default: the first). */ boldCols?: number[] }
  | { t: 'image'; url: string; height?: number }
  | { t: 'space' };

export interface Rendered {
  heading?: string;
  nodes: Node[];
}

export type BuiltInKind =
  | 'plan'
  | 'duties'
  | 'program'
  | 'cleaning'
  | 'address'
  | 'cover'
  | 'seminars'
  | 'verses'
  | 'fellowship'
  | 'notices'
  | 'qr';

export interface CustomBlock {
  id: string;
  kind: 'text' | 'image';
  title: string;
  body: string;
  imageUrl: string;
}

export const BUILT_IN: Record<BuiltInKind, string> = {
  plan: 'Сарын төлөвлөгөө (2 долоо хоног)',
  duties: 'Үйлчлэлийн хуваарь',
  program: 'Нөхөрлөлийн хуваарь (тогтмол)',
  cleaning: 'Цэвэрлэгээний хуваарь',
  address: 'Хаяг, холбоо барих',
  cover: 'Нүүр хуудас',
  seminars: 'Библийн семинар',
  verses: 'Цээжлэх эшлэл',
  fellowship: 'Энэ 7 хоногийн нөхөрлөл',
  notices: 'Чуулганы мэдээ (зарлал)',
  qr: 'QR код (апп-ын холбоос)',
};

/** Panels 0–2 = outside of the sheet (cover on the right), 3–5 = inside. Same as the printed sample. */
export const DEFAULT_PANELS: string[][] = [
  ['plan', 'duties'],
  ['program', 'cleaning', 'address'],
  ['cover'],
  ['seminars', 'verses'],
  ['fellowship'],
  ['notices', 'qr'],
];

export const PANEL_LABELS = ['1 · Гадна зүүн', '2 · Гадна дунд', '3 · Нүүр (гадна баруун)', '4 · Дотор зүүн', '5 · Дотор дунд', '6 · Дотор баруун'];

export interface IssueInfo {
  number: number;
  /** The issue's Sunday. */
  date: string;
  /** QR code image (data URL) pointing at the app. */
  qr?: string;
  siteUrl?: string;
}


function eventLine(p: MonthlyPlan): string {
  const head = p.time ? `${p.time} – ${p.title}` : p.title;
  return p.speaker ? `${head} (${p.speaker})` : head;
}

function verseWeeks(verses: MemoryVerse[], today: string) {
  const sorted = [...verses].sort((a, b) => a.week_start.localeCompare(b.week_start));
  let i = sorted.findLastIndex((v) => v.week_start <= today);
  if (i < 0) i = 0;
  return { prev: sorted[i - 1], current: sorted[i], next: sorted[i + 1] };
}

/** Content of a built-in block for this issue. */
export function renderBuiltIn(kind: BuiltInKind, data: BulletinData, issue: IssueInfo): Rendered {
  const sunday = issue.date;
  switch (kind) {
    case 'plan': {
      const end = addDays(sunday, 13);
      const plans = data.plans
        .filter((p) => p.category !== 'seminar' || !isMultiDay(p))
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || categoryRank(a.category) - categoryRank(b.category));
      const seminars = data.plans.filter((p) => isMultiDay(p) && p.event_date <= end && p.end_date! >= sunday);
      const cell = (d: string) => {
        const day = plans.filter((p) => p.event_date === d && !isMultiDay(p)).map(eventLine);
        const sem = seminars.filter((s) => s.event_date === d).map((s) => `${s.title} (${dotDate(s.event_date)}–${dotDate(s.end_date!)})`);
        return [...sem, ...day].join('\n');
      };
      const label = (d: string) => `${parseISODate(d).getDate()} ${weekdayShort(d)}`;
      // Two weeks side by side (like the printed sheet) so the table fits one panel.
      const rows = Array.from({ length: 7 }, (_, i) => {
        const a = addDays(sunday, i);
        const b = addDays(sunday, i + 7);
        return [label(a), cell(a), label(b), cell(b)];
      });
      return { heading: 'Сарын төлөвлөгөө', nodes: [{ t: 'table', rows, widths: [11, 39, 11, 39], boldCols: [0, 2] }] };
    }
    case 'duties': {
      const [w1, w2] = dutyWeeks(data.duties);
      const cell = (week: string, type: string) => {
        const row = data.duties.find((d) => d.week_date === week && d.duty_type === type);
        if (!row) return '';
        return row.district ? `${row.district}-р дүүрэг` : (row.assignees ?? '');
      };
      return {
        heading: 'Үйлчлэлийн хуваарь',
        nodes: [{ t: 'table', head: ['', shortDate(w1), shortDate(w2)], rows: DUTY_ORDER.map((t) => [DUTY_META[t].label, cell(w1, t), cell(w2, t)]), widths: [34, 33, 33] }],
      };
    }
    case 'program':
      return {
        heading: 'Нөхөрлөлийн хуваарь',
        nodes: [
          {
            t: 'table',
            rows: WEEKLY_PROGRAM.map((p) => [p.title, `${WEEKDAYS_MN[p.weekday]} гараг`, `${p.time} цаг`]),
            widths: [46, 30, 24],
          },
        ],
      };
    case 'cleaning': {
      const { rows } = activeCleaning(data.cleaning, sunday);
      // Two assignments per row, like the printed table.
      const pairs = Array.from({ length: Math.ceil(rows.length / 2) }, (_, i) => {
        const [a, b] = [rows[i * 2], rows[i * 2 + 1]];
        return [a.district, a.area, b?.district ?? '', b?.area ?? ''];
      });
      return { heading: 'Цэвэрлэгээний хуваарь', nodes: [{ t: 'table', rows: pairs, widths: [12, 38, 12, 38], boldCols: [0, 2] }] };
    }
    case 'address': {
      const info = data.churchInfo;
      const nodes: Node[] = [];
      if (info.address) nodes.push({ t: 'p', text: `Хаяг: ${info.address}` });
      if (info.phone) nodes.push({ t: 'p', text: `Утас: ${info.phone}`, bold: true });
      if (info.map_url) nodes.push({ t: 'p', text: info.map_url, size: 8, color: '1F4E79' });
      if (!nodes.length) nodes.push({ t: 'p', text: 'Хаяг, утсаа Админ → Тохиргоо → Ерөнхий хэсэгт оруулна уу.', italic: true });
      return { heading: 'Хаяг', nodes };
    }
    case 'cover':
      // Drawn entirely as artwork in the page-1 background (art.ts).
      return { nodes: [] };
    case 'qr': {
      if (!issue.qr) return { nodes: [] };
      return {
        nodes: [
          { t: 'space' },
          { t: 'image', url: issue.qr, height: 120 },
          { t: 'p', text: 'Чуулганы Мэдээ апп', bold: true, align: 'center', color: '173A5E' },
          { t: 'p', text: 'Утасныхаа камераар уншуулж нээнэ үү', align: 'center', size: 8.5 },
          ...(issue.siteUrl ? [{ t: 'p', text: issue.siteUrl.replace(/^https?:\/\//, ''), align: 'center', size: 8.5, color: '2E75B6' } as Node] : []),
        ],
      };
    }
    case 'seminars': {
      const home = data.churchInfo.church_name.trim().split(/\s+/)[0].toLowerCase();
      const ours = data.seminars.find((s) => splitList(s.churches).some((c) => c.toLowerCase() === home));
      const speaker = data.plans.find((p) => p.category === 'seminar' && isMultiDay(p))?.speaker ?? '';
      const range = (a: string, b: string) => `${dotDate(a)} (${weekdayShort(a)}) – ${dotDate(b)} (${weekdayShort(b)})`;
      const nodes: Node[] = [];
      if (ours) nodes.push({ t: 'table', head: ['Чуулган', 'Хэзээ', 'Илтгэгч'], rows: [[data.churchInfo.church_name.split(/\s+/)[0], range(ours.start_date, ours.end_date), speaker]], widths: [26, 44, 30] });
      if (data.seminars.length) {
        nodes.push({ t: 'space' }, { t: 'p', text: 'МОНГОЛ ЧУУЛГАНЫ БИБЛИЙН СЕМИНАР', bold: true, align: 'center' });
        nodes.push({ t: 'table', head: ['Хэзээ', 'Чуулган'], rows: data.seminars.map((s) => [range(s.start_date, s.end_date), s.churches]), widths: [42, 58] });
      }
      return { heading: 'Библийн семинар', nodes: nodes.length ? nodes : [{ t: 'p', text: 'Семинарын мэдээлэл ороогүй байна.', italic: true }] };
    }
    case 'verses': {
      const { prev, current, next } = verseWeeks(data.verses, sunday);
      const nodes: Node[] = [];
      const add = (label: string, v?: MemoryVerse) => {
        if (!v) return;
        nodes.push({ t: 'p', text: label, bold: true, color: '1F4E79' }, { t: 'p', text: v.text }, { t: 'p', text: `/${v.reference}/`, bold: true, align: 'right' });
      };
      add('Өнгөрсөн долоо хоногийн эшлэл', prev);
      add('Энэ долоо хоногийн эшлэл', current);
      add('Ирэх долоо хоногийн эшлэл', next);
      return { heading: 'Цээжлэх эшлэл', nodes };
    }
    case 'fellowship': {
      const until = addDays(sunday, 6);
      const list = data.plans
        .filter((p) => p.category === 'fellowship' && p.event_date >= sunday && p.event_date <= until)
        .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.time ?? '').localeCompare(b.time ?? ''));
      const nodes: Node[] = [];
      for (const p of list) {
        nodes.push({ t: 'p', text: p.title.toUpperCase(), bold: true, align: 'center' });
        nodes.push({ t: 'p', text: `Хэзээ: ${dotDate(p.event_date)} (${weekdayShort(p.event_date)})${p.time ? `, ${p.time} цагт` : ''}` });
        if (p.location || p.speaker) nodes.push({ t: 'p', text: [p.location && `Хаана: ${p.location}`, p.speaker && `(${p.speaker})`].filter(Boolean).join('  ') });
        nodes.push({ t: 'space' });
      }
      return { heading: 'Нөхөрлөлийн хуваарь', nodes: nodes.length ? nodes : [{ t: 'p', text: 'Энэ долоо хоногт нөхөрлөл ороогүй байна.', italic: true }] };
    }
    case 'notices': {
      const nodes: Node[] = data.announcements.flatMap((a): Node[] => [
        { t: 'p', text: `• ${a.title}`, bold: true },
        ...(a.summary ? [{ t: 'p', text: a.body || a.summary } as Node] : []),
        ...(a.event_date ? [{ t: 'p', text: `Хэзээ: ${dotDate(a.event_date)} (${weekdayShort(a.event_date)})`, size: 9 } as Node] : []),
        { t: 'space' },
      ]);
      return { heading: 'Чуулганы мэдээ', nodes: nodes.length ? nodes : [{ t: 'p', text: 'Зарлал ороогүй байна.', italic: true }] };
    }
  }
}

export function renderCustom(b: CustomBlock): Rendered {
  if (b.kind === 'image') {
    return { heading: b.title || undefined, nodes: b.imageUrl ? [{ t: 'image', url: b.imageUrl, height: 220 }] : [] };
  }
  return {
    heading: b.title || undefined,
    nodes: b.body.split('\n').map((line): Node => (line.trim() ? { t: 'p', text: line } : { t: 'space' })),
  };
}

/** One-line description for the editor chips. */
export function summarize(r: Rendered): string {
  const tables = r.nodes.filter((n) => n.t === 'table') as Extract<Node, { t: 'table' }>[];
  if (tables.length) return `${tables.reduce((n, t) => n + t.rows.length, 0)} мөр хүснэгт`;
  const text = r.nodes.find((n) => n.t === 'p') as Extract<Node, { t: 'p' }> | undefined;
  if (text) return text.text.slice(0, 60);
  if (r.nodes.some((n) => n.t === 'image')) return 'Зураг';
  return 'Хоосон';
}

