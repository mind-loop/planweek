import { PAGE_H, PAGE_W, flush } from './art';

/*
 * PDF export of the weekly bulletin: each preview page (artwork + text, at
 * full A4 size) is rasterised and placed on an A4 landscape PDF page, so the
 * PDF looks exactly like the preview. The preview pages are cloned off-screen
 * first, which also works while the preview tab is hidden on phones.
 */
export async function downloadBulletinPdf(filename: string, scale = 2.5): Promise<void> {
  const pages = Array.from(document.querySelectorAll<HTMLElement>('[data-bulletin-page]'));
  if (!pages.length) throw new Error('Урьдчилан харах хуудас олдсонгүй');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  await document.fonts.ready;

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-${PAGE_W * 2}px;top:0;width:${PAGE_W}px;pointer-events:none`;
  document.body.appendChild(host);

  try {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    for (const [i, page] of pages.entries()) {
      const clone = page.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.position = 'relative';
      // editor-only marks (overflow warnings) don't belong in the file
      clone.querySelectorAll('[data-pdf-ignore]').forEach((el) => el.remove());
      clone.querySelectorAll<HTMLElement>('*').forEach((el) => (el.style.outline = 'none'));
      host.replaceChildren(clone);

      const canvas = await html2canvas(clone, { scale, width: PAGE_W, height: PAGE_H, backgroundColor: '#ffffff', useCORS: true, logging: false });
      if (i > 0) pdf.addPage('a4', 'landscape');
      pdf.addImage(flush(canvas, 'image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    }
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
