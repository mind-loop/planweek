import { PAGE_H, PAGE_W, flush } from './art';

/*
 * PDF export of the weekly bulletin: each preview page (artwork + text, at
 * full A4 size) is rasterised and placed on an A4 landscape PDF page, so the
 * PDF looks exactly like the preview. The preview pages are cloned off-screen
 * first, which also works while the preview tab is hidden on phones.
 */
/**
 * html2canvas re-renders the page inside a fresh iframe that loads the app's
 * stylesheet again over the network; on a slow or flaky connection a page can
 * be captured before it arrives, losing the grid, borders and capitals. Writing
 * every computed style onto the elements themselves makes the copy self-contained.
 */
function inlineStyles(root: HTMLElement) {
  const els = [root, ...root.querySelectorAll<HTMLElement>('*')];
  // read everything first, then write, so the layout is computed only once
  const styles = els.map((el) => {
    const cs = getComputedStyle(el);
    const out: [string, string][] = [];
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (!p.startsWith('--')) out.push([p, cs.getPropertyValue(p)]);
    }
    return out;
  });
  els.forEach((el, i) => {
    for (const [p, v] of styles[i]) el.style.setProperty(p, v);
  });
}

/**
 * The page's web fonts (Oswald headings) as self-contained @font-face rules,
 * font files embedded as data URLs: like the stylesheet, the fonts would
 * otherwise have to load again inside html2canvas's iframe, and text measured
 * with a fallback font gets misplaced (merged or spread-out words).
 */
async function embeddedFontFaces(): Promise<string> {
  const rules: CSSFontFaceRule[] = [];
  const walk = (list: CSSRuleList) => {
    for (const r of Array.from(list)) {
      if (r instanceof CSSFontFaceRule) rules.push(r);
      else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      /* cross-origin sheet */
    }
  }
  const css = await Promise.all(
    rules
      .filter((r) => /oswald/i.test(r.style.getPropertyValue('font-family')))
      .map(async (r) => {
        let text = r.cssText;
        const base = r.parentStyleSheet?.href ?? location.href;
        for (const m of text.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
          if (m[2].startsWith('data:')) continue;
          try {
            const blob = await (await fetch(new URL(m[2], base))).blob();
            const data = await new Promise<string>((resolve) => {
              const fr = new FileReader();
              fr.onload = () => resolve(fr.result as string);
              fr.readAsDataURL(blob);
            });
            text = text.replace(m[0], `url(${data})`);
          } catch {
            /* keep the original URL */
          }
        }
        return text;
      }),
  );
  return css.join('\n');
}

export async function downloadBulletinPdf(filename: string, scale = 2.5): Promise<void> {
  const pages = Array.from(document.querySelectorAll<HTMLElement>('[data-bulletin-page]'));
  if (!pages.length) throw new Error('Урьдчилан харах хуудас олдсонгүй');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  await document.fonts.ready;
  const fontCss = await embeddedFontFaces();

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
      inlineStyles(clone);

      const canvas = await html2canvas(clone, { scale, width: PAGE_W, height: PAGE_H, backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          const style = doc.createElement('style');
          style.textContent = fontCss;
          doc.head.appendChild(style);
        },
      });
      if (i > 0) pdf.addPage('a4', 'landscape');
      pdf.addImage(flush(canvas, 'image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    }
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
