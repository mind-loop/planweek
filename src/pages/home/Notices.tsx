import { CalendarDays, ChevronRight, Megaphone } from 'lucide-react';
import { cn, longDate, weekdayMn } from '../../lib/utils';
import type { Announcement } from '../../types/database';
import { Card, SectionTitle, Sheet } from '../../components/ui';

const TAG_STYLE = {
  featured: { label: 'Онцлох', className: 'bg-amber-400 text-amber-950' },
  this_week: { label: 'Энэ 7 хоногт', className: 'bg-cyan-100 text-cyan-800' },
  seminar: { label: 'Семинар', className: 'bg-indigo-100 text-indigo-800' },
} as const;

export function TagBadge({ tag, className }: { tag: Announcement['tag']; className?: string }) {
  if (!tag) return null;
  const s = TAG_STYLE[tag];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', s.className, className)}>{s.label}</span>;
}

/** Full announcement — opened from the banner or the Зарлал list. */
export function AnnouncementSheet({ item, onClose }: { item: Announcement | null; onClose: () => void }) {
  return (
    <Sheet open={!!item} onClose={onClose} title={item?.title ?? ''}>
      {item && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TagBadge tag={item.tag} />
            {item.event_date && (
              <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-cyan-800">
                <CalendarDays className="size-4" />
                {longDate(item.event_date)}, {weekdayMn(item.event_date)}
              </span>
            )}
          </div>
          {item.image_url && <img src={item.image_url} alt={item.title} className="w-full rounded-2xl" />}
          <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{item.body || item.summary}</p>
        </div>
      )}
    </Sheet>
  );
}

/** Зарлал — the regular (non-banner) announcements as a calm list. */
export function NoticesSection({ items, onOpen }: { items: Announcement[]; onOpen: (a: Announcement) => void }) {
  return (
    <section>
      <SectionTitle icon={<Megaphone className="size-5" />} title="Зарлал" />
      {items.length === 0 ? (
        <p className="rounded-3xl bg-white px-5 py-6 text-center text-[15px] text-slate-400 shadow-soft">Одоогоор зарлал алга</p>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {items.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpen(a)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{a.title}</p>
                  <TagBadge tag={a.tag} className="shrink-0" />
                </div>
                <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug text-slate-500">{a.summary}</p>
                {a.event_date && (
                  <p className="mt-1 text-[13px] font-medium text-cyan-700">
                    {longDate(a.event_date)}, {weekdayMn(a.event_date)}
                  </p>
                )}
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-300" />
            </button>
          ))}
        </Card>
      )}
    </section>
  );
}
