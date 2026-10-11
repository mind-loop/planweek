import { useRef, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronRight, GraduationCap, Megaphone } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { cn, dotDate, longDate, parseISODate, splitList, todayISO } from '../../lib/utils';
import type { Announcement, NationalSeminar } from '../../types/database';
import { Segmented, Sheet } from '../../components/ui';
import { SeminarDuties } from '../SeminarDuties';
import { SeminarSchedule } from '../SeminarSchedule';
import { TagBadge } from './Notices';

const homeKey = (name: string | undefined) => (name ?? 'Увс').trim().split(/\s+/)[0].toLowerCase();

function daysUntil(iso: string): number {
  return Math.round((parseISODate(iso).getTime() - parseISODate(todayISO()).getTime()) / 86_400_000);
}

function seminarStatus(s: NationalSeminar): string {
  const today = todayISO();
  if (today >= s.start_date && today <= s.end_date) return 'Явагдаж байна';
  const n = daysUntil(s.start_date);
  return n === 1 ? 'Маргааш эхэлнэ' : `${n} хоногийн дараа`;
}

type Slide = { kind: 'seminar'; seminar: NationalSeminar } | { kind: 'news'; item: Announcement };

/** Онцлох мэдээ + семинар. Tap a slide for details. */
export function HomeBanner({ featured, onOpenAnnouncement }: { featured: Announcement[]; onOpenAnnouncement: (a: Announcement) => void }) {
  const { result } = useBulletin();
  const [index, setIndex] = useState(0);
  const [seminarOpen, setSeminarOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  if (!result) return null;

  const today = todayISO();
  const home = homeKey(result.data.churchInfo.church_name);
  const upcoming = result.data.seminars.filter((s) => s.end_date >= today);
  // Prefer the session our own church attends.
  const ourSeminar = upcoming.find((s) => splitList(s.churches).some((c) => c.toLowerCase() === home)) ?? upcoming[0];

  const slides: Slide[] = [
    ...(ourSeminar ? [{ kind: 'seminar', seminar: ourSeminar } as const] : []),
    ...featured.map((item) => ({ kind: 'news', item }) as const),
  ];

  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (slides.length === 0) return <IssueBanner />;

  return (
    <section>
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto">
        {slides.map((s) => (
          <div key={s.kind === 'seminar' ? 'seminar' : s.item.id} className="w-full shrink-0 snap-center px-4">
            {s.kind === 'seminar' ? (
              <SeminarSlide seminar={s.seminar} home={home} onOpen={() => setSeminarOpen(true)} />
            ) : (
              <NewsSlide item={s.item} onOpen={() => onOpenAnnouncement(s.item)} />
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all duration-300', i === index ? 'w-5 bg-slate-800' : 'w-1.5 bg-slate-300')} />
          ))}
        </div>
      )}

      <SeminarSheet open={seminarOpen} onClose={() => setSeminarOpen(false)} />
    </section>
  );
}

function SlideShell({ onOpen, className, children }: { onOpen?: () => void; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('relative flex h-48 w-full flex-col justify-end overflow-hidden rounded-3xl p-5 text-left text-white shadow-soft transition active:scale-[0.99]', className)}
    >
      {children}
    </button>
  );
}

function SeminarSlide({ seminar, home, onOpen }: { seminar: NationalSeminar; home: string; onOpen: () => void }) {
  const live = todayISO() >= seminar.start_date;
  const churches = splitList(seminar.churches);
  return (
    <SlideShell onOpen={onOpen} className="bg-linear-to-br from-indigo-600 via-violet-700 to-indigo-900">
      <GraduationCap className="pointer-events-none absolute -right-5 -top-4 size-40 text-white/10" aria-hidden />
      <span
        className={cn(
          'absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
          live ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20 backdrop-blur',
        )}
      >
        {live && <span className="size-1.5 animate-pulse rounded-full bg-emerald-900" />}
        {seminarStatus(seminar)}
      </span>
      <p className="text-sm font-medium text-indigo-100">
        {dotDate(seminar.start_date)} – {dotDate(seminar.end_date)}
      </p>
      <h3 className="text-2xl font-bold leading-tight">Библийн семинар</h3>
      <p className="mt-1 line-clamp-1 pr-8 text-sm text-indigo-100">
        {churches.map((c, i) => (
          <span key={c} className={cn(c.toLowerCase() === home && 'font-bold text-white')}>
            {c}
            {i < churches.length - 1 && ', '}
          </span>
        ))}
      </p>
      <ChevronRight className="absolute bottom-5 right-5 size-5 text-white/70" />
    </SlideShell>
  );
}

function NewsSlide({ item, onOpen }: { item: Announcement; onOpen: () => void }) {
  return (
    <SlideShell
      onOpen={onOpen}
      className={
        item.image_url
          ? 'bg-slate-800'
          : item.tag === 'seminar'
            ? 'bg-linear-to-br from-indigo-600 via-violet-700 to-indigo-900'
            : 'bg-linear-to-br from-cyan-600 to-cyan-800'
      }
    >
      {item.image_url ? (
        <>
          <img src={item.image_url} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-900/30 to-transparent" />
        </>
      ) : item.tag === 'seminar' ? (
        <GraduationCap className="pointer-events-none absolute -right-5 -top-4 size-40 text-white/10" aria-hidden />
      ) : (
        <Megaphone className="pointer-events-none absolute -right-4 -top-3 size-36 -rotate-12 text-white/10" aria-hidden />
      )}
      <div className="absolute left-5 top-5 flex items-center gap-2">
        <TagBadge tag={item.tag ?? 'featured'} />
      </div>
      <div className="relative pr-6">
        {item.event_date && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-white/80">
            <CalendarDays className="size-3.5" /> {longDate(item.event_date)}
          </p>
        )}
        <h3 className="line-clamp-2 text-xl font-bold leading-tight">{item.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-white/80">{item.summary}</p>
      </div>
      <ChevronRight className="absolute bottom-5 right-5 size-5 text-white/70" />
    </SlideShell>
  );
}

/** Shown when there is nothing to feature: the church photo + this week's issue. */
function IssueBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl shadow-soft">
      <img src="/church.jpg" alt="" className="h-44 w-full object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-900/10 to-transparent" />
      <p className="absolute bottom-4 left-5 text-xl font-bold text-white">Чуулганы Мэдээ</p>
    </section>
  );
}

/** Seminar details: our 5-day duties + every church's dates. */
function SeminarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { result } = useBulletin();
  const hasDuties = (result?.data.seminarDuties.length ?? 0) > 0;
  const [view, setView] = useState<'duties' | 'all'>('duties');

  return (
    <Sheet open={open} onClose={onClose} title="Библийн семинар">
      {hasDuties && (
        <Segmented
          label="Семинар"
          value={view}
          onChange={setView}
          options={[
            { id: 'duties', label: 'Манай үйлчлэл' },
            { id: 'all', label: 'Бүх чуулган' },
          ]}
        />
      )}
      {hasDuties && view === 'duties' ? <SeminarDuties /> : <SeminarSchedule />}
    </Sheet>
  );
}
