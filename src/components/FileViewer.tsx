import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Full-screen viewer for an uploaded image or PDF.
 * Images: tap to toggle fit ↔ full size (scrollable). PDFs: inline on desktop;
 * phones can't render PDFs in a frame reliably, so they get an "open" button.
 */
export function FileViewer({
  open,
  onClose,
  title,
  url,
  downloadUrl,
  isImage,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  downloadUrl: string;
  isImage: boolean;
}) {
  const [zoomed, setZoomed] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    if (!open) return;
    setZoomed(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="animate-fade-in fixed inset-0 z-[70] flex flex-col bg-slate-950">
      {/* Top bar */}
      <div className="pt-safe flex items-center gap-2 px-3 py-2 text-white">
        <p className="min-w-0 flex-1 truncate px-2 text-[15px] font-semibold">{title}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Хаах"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 active:bg-white/20"
        >
          <X className="size-6" />
        </button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        {isImage ? (
          <div className={cn('flex min-h-full', zoomed ? 'w-max' : 'items-center justify-center p-3')}>
            <img
              src={url}
              alt={title}
              onClick={() => setZoomed((z) => !z)}
              className={cn('select-none', zoomed ? 'max-w-none cursor-zoom-out' : 'max-h-full max-w-full cursor-zoom-in object-contain')}
              draggable={false}
            />
          </div>
        ) : touch ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-white">
            <span className="grid size-20 place-items-center rounded-3xl bg-white/10">
              <FileText className="size-10" />
            </span>
            <p className="text-[15px] text-white/70">PDF файлыг утасны үзэгчээр нээнэ</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 font-semibold text-slate-900 active:scale-[0.98]"
            >
              <ExternalLink className="size-5" /> PDF нээх
            </a>
          </div>
        ) : (
          <iframe src={url} title={title} className="size-full bg-white" />
        )}
      </div>

      {/* Bottom bar */}
      <div className="pb-safe flex items-center justify-center gap-3 px-4 py-3">
        {isImage && <p className="flex-1 text-xs text-white/50">{zoomed ? 'Дарж багасгана' : 'Дарж томруулна'}</p>}
        <a
          href={downloadUrl}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 font-semibold text-white active:scale-[0.98]"
        >
          <Download className="size-5" /> Татах
        </a>
      </div>
    </div>,
    document.body,
  );
}
