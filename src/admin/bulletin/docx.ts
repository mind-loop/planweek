import {
  AlignmentType,
  BorderStyle,
  ColumnBreak,
  Document,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingType,
  VerticalPositionRelativeFrom,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import type { Node, Rendered } from './model';
import { COL_W, HEADING_H, PAGE_H, PAGE_W, headingStyleFor, renderHeading } from './art';

/*
 * Word export of the weekly 3-fold bulletin, styled after Template.pdf:
 * A4 landscape, 3 columns per page, panels separated by column breaks.
 * The page artwork (navy column, cover, top band) sits behind the text as a
 * full-page picture, so every text and table stays editable in Word.
 */

const FONT = 'Arial';
const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT } as const;
const pt = (n: number) => n * 2; // docx uses half-points
const WHITE = 'FFFFFF';

const dataOf = async (url: string) => (await fetch(url)).arrayBuffer();

/** Full-page picture behind the text, anchored to the page's top-left corner. */
async function background(url: string): Promise<Paragraph> {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 20 },
    children: [
      new ImageRun({
        type: 'jpg',
        data: await dataOf(url),
        transformation: { width: PAGE_W, height: PAGE_H },
        floating: {
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
          behindDocument: true,
          allowOverlap: true,
          lockAnchor: true,
          wrap: { type: TextWrappingType.NONE },
        },
      }),
    ],
  });
}

async function heading(text: string, panel: number, first: boolean): Promise<Paragraph> {
  return new Paragraph({
    spacing: { before: 0, after: 100 },
    children: [
      new ImageRun({
        type: 'png',
        data: await dataOf(await renderHeading(text, headingStyleFor(panel, first))),
        transformation: { width: Math.round(COL_W), height: HEADING_H },
        altText: { name: text, description: text, title: text },
      }),
    ],
  });
}

function paragraph(n: Extract<Node, { t: 'p' }>, onNavy: boolean): Paragraph {
  return new Paragraph({
    alignment: n.align ? ALIGN[n.align] : undefined,
    spacing: { after: 40 },
    // On the navy column text sits in white boxes, as in the template.
    shading: onNavy ? { type: ShadingType.CLEAR, fill: WHITE, color: 'auto' } : undefined,
    children: n.text.split('\n').map(
      (line, i) =>
        new TextRun({
          text: line,
          break: i > 0 ? 1 : undefined,
          bold: n.bold,
          italics: n.italic,
          color: n.color,
          size: pt(n.size ?? 9.5),
          font: FONT,
        }),
    ),
  });
}

function cellParagraphs(text: string, bold: boolean): Paragraph[] {
  return (text || ' ').split('\n').map(
    (line) => new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: line, bold, size: pt(8.5), font: FONT })] }),
  );
}

const border = { style: BorderStyle.SINGLE, size: 4, color: '2E75B6' };

function table(n: Extract<Node, { t: 'table' }>): Table {
  const cols = Math.max(n.head?.length ?? 0, ...n.rows.map((r) => r.length));
  const widths = n.widths ?? Array.from({ length: cols }, () => 100 / cols);
  const bold = n.boldCols ?? [0];
  const row = (cells: string[], head = false) =>
    new TableRow({
      tableHeader: head,
      children: Array.from({ length: cols }, (_, i) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: head ? 'DEEAF6' : WHITE, color: 'auto' },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: cellParagraphs(cells[i] ?? '', head || bold.includes(i)),
        }),
      ),
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [...(n.head ? [row(n.head, true)] : []), ...n.rows.map((r) => row(r))],
  });
}

/** Fetches an image (own site, Supabase Storage or a data URL) sized to the column. */
async function image(n: Extract<Node, { t: 'image' }>): Promise<Paragraph | null> {
  try {
    const res = await fetch(n.url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const ratio = bmp.height / bmp.width;
    let width = Math.round(COL_W);
    let height = Math.round(width * ratio);
    if (n.height && height > n.height) {
      height = n.height;
      width = Math.round(height / ratio);
    }
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new ImageRun({ type: blob.type.includes('png') ? 'png' : 'jpg', data: await blob.arrayBuffer(), transformation: { width, height } })],
    });
  } catch {
    return null; // a missing image shouldn't stop the whole document
  }
}

async function blockChildren(r: Rendered, panel: number, first: boolean): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];
  if (r.heading) out.push(await heading(r.heading, panel, first));
  for (const n of r.nodes) {
    if (n.t === 'p') out.push(paragraph(n, panel === 1));
    else if (n.t === 'table') out.push(table(n), new Paragraph({ spacing: { after: 80 }, children: [] }));
    else if (n.t === 'space') out.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    else {
      const img = await image(n);
      if (img) out.push(img);
    }
  }
  return out;
}

/** Builds the .docx and triggers the download. */
export async function downloadBulletinDocx(
  panels: Rendered[][],
  art: { page1: string; page2: string },
  filename: string,
): Promise<void> {
  const children: (Paragraph | Table)[] = [];
  for (let i = 0; i < panels.length; i++) {
    if (i === 0) children.push(await background(art.page1));
    if (i === 3) children.push(await background(art.page2));
    for (const [j, block] of panels[i].entries()) children.push(...(await blockChildren(block, i, j === 0)));
    // Next panel = next column; after panel 3 Word continues on page 2.
    if (i < panels.length - 1) children.push(new Paragraph({ children: [new ColumnBreak()] }));
  }

  const doc = new Document({
    creator: 'Чуулганы Мэдээ',
    title: filename,
    styles: { default: { document: { run: { font: FONT, size: pt(9.5) } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297), orientation: PageOrientation.LANDSCAPE },
            margin: { top: 567, bottom: 567, left: 567, right: 567 },
          },
          column: { count: 3, space: 567, equalWidth: true },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
