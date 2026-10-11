import { useEffect, useRef, useState } from 'react';
import { useBulletin } from '../../context/DataContext';
import { cn, todayISO } from '../../lib/utils';
import type { Banner } from '../../types/database';
import { FileViewer } from '../../components/FileViewer';

const AUTOPLAY_MS = 4500;

const isLive = (b: Banner, today: string) => (!b.start_date || b.start_date <= today) && (!b.end_date || b.end_date >= today);

/** Image banners from Админ → Зар → Баннер. Slides advance on their own; a touch pauses them. */
export function HomeBanner() {
  const { result } = useBulletin();
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState<Banner | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  const today = todayISO();
  const banners = (result?.data.banners ?? []).filter((b) => isLive(b, today));
  const count = banners.length;

  // Autoplay (skipped when the viewer prefers reduced motion).
  useEffect(() => {
    if (count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const el = scroller.current;
      if (!el || paused.current || document.hidden) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const pause = () => (paused.current = true);
  const resume = () => window.setTimeout(() => (paused.current = false), AUTOPLAY_MS);

  const open = (b: Banner) => {
    if (b.link_url) window.open(b.link_url, '_blank', 'noopener');
    else setViewing(b);
  };

  return (
    <section aria-roledescription="carousel" aria-label="Баннер">
      <div
        ref={scroller}
        onScroll={onScroll}
        onTouchStart={pause}
        onTouchEnd={resume}
        onMouseEnter={pause}
        onMouseLeave={resume}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto"
      >
        {banners.map((b, i) => (
          <div key={b.id} className="w-full shrink-0 snap-center px-4" aria-label={`${i + 1} / ${count}`}>
            <button
              type="button"
              onClick={() => open(b)}
              className="block w-full overflow-hidden rounded-3xl bg-slate-200 shadow-soft transition active:scale-[0.99]"
            >
              <img src={b.image_url} alt={b.title ?? ''} loading={i === 0 ? 'eager' : 'lazy'} className="aspect-video w-full object-cover" />
            </button>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {banners.map((b, i) => (
            <span key={b.id} className={cn('h-1.5 rounded-full transition-all duration-300', i === index ? 'w-5 bg-slate-800' : 'w-1.5 bg-slate-300')} />
          ))}
        </div>
      )}

      <FileViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? 'Баннер'}
        url={viewing?.image_url ?? ''}
        downloadUrl={viewing ? `${viewing.image_url}?download=` : ''}
        isImage
      />
    </section>
  );
}
