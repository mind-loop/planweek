import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MapPin, X } from 'lucide-react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ Card */

export function Card({
  children,
  className,
  highlighted,
}: {
  children: ReactNode;
  className?: string;
  /** Applies the "this is your district" accent ring. */
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-3xl bg-white shadow-soft ring-1 transition-all duration-300',
        highlighted ? 'ring-2 ring-amber-400' : 'ring-transparent',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------- Section title */

export function SectionTitle({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
        {icon && <span className="text-slate-400">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------- "Your district" */

export function MineBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'animate-pop inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow-sm',
        className,
      )}
    >
      <MapPin className="size-3.5" aria-hidden />
      Таны дүүрэг
    </span>
  );
}

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/80', className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Ачаалж байна">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

/* --------------------------------------------------------------- Empty */

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-10 text-center">
      <div className="mb-3 text-slate-400">{icon}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-[15px] text-slate-500">{hint}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- Accordion */

export function Accordion({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left font-semibold text-slate-800"
      >
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="flex-1">{title}</span>
        <ChevronDown
          className={cn('size-5 text-slate-400 transition-transform duration-300', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {/* grid-rows trick animates height without measuring */}
      <div
        id={id}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-4 py-3">{children}</div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ Bottom sheet */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Callers usually pass an inline arrow; keeping it in a ref stops the effect below
  // from re-running on every render, which stole focus from inputs (closing the
  // mobile keyboard after each keystroke).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet-up pb-safe relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <div className="flex items-start gap-3 px-5 pb-2 pt-3">
          <h2 id={titleId} className="flex-1 text-xl font-bold leading-snug text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95"
          >
            <X className="size-6" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------- Info line */

export function InfoLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[15px] text-slate-600">
      <span className="shrink-0 text-slate-400 [&>svg]:size-4">{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------- Segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; sub?: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const n = options.length;
  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative mb-4 grid rounded-2xl bg-slate-200/70 p-1"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            'relative z-10 flex min-h-12 flex-col items-center justify-center rounded-xl px-1 transition-colors',
            o.id === value ? 'text-cyan-800' : 'text-slate-600',
          )}
        >
          <span className="text-[15px] font-bold leading-tight">{o.label}</span>
          {o.sub && <span className="text-xs font-medium">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}
