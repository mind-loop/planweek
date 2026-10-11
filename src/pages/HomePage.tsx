import { useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  CalendarDays,
  ChevronRight,
  Copy,
  Lock,
  Megaphone,
  Share2,
  Sparkles,
  SprayCan,
  Star,
} from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { InstallBanner } from '../components/InstallApp';
import { useDistrict } from '../context/DistrictContext';
import { useToast } from '../context/ToastContext';
import { DUTY_META, SEMINAR_DUTY_META, dutyWeeks } from '../lib/duty';
import { cn, longDate, shortDate, todayISO, weekdayMn } from '../lib/utils';
import type { Announcement, MemoryVerse } from '../types/database';
import type { TabId } from '../components/BottomNav';
import { Accordion, Card, EmptyState, SectionTitle, Sheet } from '../components/ui';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Өглөөний мэнд';
  if (h < 18) return 'Өдрийн мэнд';
  return 'Оройн мэнд';
}

export function HomePage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { result } = useBulletin();
  if (!result) return null;
  const { churchInfo, announcements, verses } = result.data;

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <section className="px-1 pt-2">
        <p className="text-sm font-medium text-slate-500">
          {weekdayMn(todayISO())}, {longDate(todayISO())}
        </p>
        <h2 className="mt-1 text-[28px] font-bold leading-tight tracking-tight text-slate-900">{greeting()} 👋</h2>
      </section>

      <InstallBanner />

      {/* Issue banner */}
      <section className="relative overflow-hidden rounded-3xl shadow-soft">
        <img src="/church.jpg" alt="" className="h-40 w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-900/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
          <div>
            <p className="text-xs font-medium text-white/80">Чуулганы Мэдээ</p>
            <p className="text-xl font-bold leading-tight">Дугаар №{churchInfo.issue_no}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <CalendarDays className="size-3.5" /> {longDate(churchInfo.issue_date)}
          </span>
        </div>
      </section>

      <MyDutiesCard onNavigate={onNavigate} />

      <section>
        <SectionTitle icon={<Megaphone className="size-5" />} title="Зарууд" />
        {announcements.length ? (
          <AnnouncementCarousel items={announcements} />
        ) : (
          <EmptyState icon={<Megaphone className="size-8" />} title="Одоогоор зар алга" />
        )}
      </section>

      <VerseSection verses={verses} />

      <footer className="flex flex-col items-center gap-1 pt-4 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {churchInfo.church_name}</p>
        {/* Deliberately faint: the only visible way into the admin panel. */}
        <a href="#/admin" aria-label="Нэвтрэх" className="grid size-10 place-items-center rounded-full text-slate-300 transition active:text-slate-500">
          <Lock className="size-3.5" />
        </a>
      </footer>
    </div>
  );
}

/* --------------------------------------------------------- My duties */

function MyDutiesCard({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { result, districts } = useBulletin();
  const { district, isMine } = useDistrict();

  const items = useMemo(() => {
    if (!result || !district) return [];
    const [current, next] = dutyWeeks(result.data.duties);
    const duties = result.data.duties
      .filter((d) => (d.week_date === current || d.week_date === next) && isMine(d.district))
      .map((d) => ({
        key: d.id,
        icon: DUTY_META[d.duty_type].icon,
        tint: DUTY_META[d.duty_type].tint,
        title: DUTY_META[d.duty_type].label,
        sub: d.week_date === current ? `Энэ Ням · ${shortDate(d.week_date)}` : `Дараа Ням · ${shortDate(d.week_date)}`,
        tab: 'duty' as TabId,
      }));
    const cleaning = result.data.cleaning
      .filter((c) => isMine(c.district))
      .map((c) => ({
        key: c.id,
        icon: SprayCan,
        tint: 'bg-sky-50 text-sky-700 ring-sky-100',
        title: `Цэвэрлэгээ: ${c.area}`,
        sub: `${c.tasks.length} ажил`,
        tab: 'cleaning' as TabId,
      }));
    const today = todayISO();
    const seminar = result.data.seminarDuties
      .filter((s) => s.day_date >= today && isMine(s.assignees))
      .map((s) => ({
        key: s.id,
        icon: SEMINAR_DUTY_META[s.duty_type].icon,
        tint: 'bg-linear-to-br from-indigo-500 to-violet-600 text-white ring-indigo-200',
        title: `Семинар: ${SEMINAR_DUTY_META[s.duty_type].label}`,
        sub: `${weekdayMn(s.day_date)} · ${shortDate(s.day_date)}`,
        tab: 'duty' as TabId,
      }));
    return [...seminar, ...duties, ...cleaning];
  }, [result, district, isMine]);

  if (!district) {
    if (districts.length === 0) return null;
    return (
      <Card className="flex items-center gap-3 p-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <Sparkles className="size-5" />
        </div>
        <p className="text-[15px] leading-snug text-slate-700">
          Дээрх <b>дүүргээ</b> сонговол таны гал тогоо, хүүхэд харах, угталт, цэвэрлэгээний үүрэг энд гарна.
        </p>
      </Card>
    );
  }

  return (
    <section key={district} className="animate-fade-up">
      <SectionTitle icon={<Star className="size-5" />} title={`${district}-р дүүргийн үүрэг`} />
      {items.length === 0 ? (
        <Card className="p-4 text-[15px] text-slate-600">Ойрын 2 долоо хоногт танай дүүрэгт хуваарилсан үүрэг алга. 🙏</Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {items.map(({ key, icon: Icon, tint, title, sub, tab }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(tab)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition active:bg-slate-50"
            >
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1', tint)}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{title}</span>
                <span className="block text-sm text-slate-500">{sub}</span>
              </span>
              <ChevronRight className="size-5 text-slate-400" />
            </button>
          ))}
        </Card>
      )}
    </section>
  );
}

/* ------------------------------------------------------ Announcements */

const TAG_STYLE = {
  featured: { label: 'Онцлох зар', className: 'bg-amber-400 text-amber-950' },
  this_week: { label: 'Энэ 7 хоногт', className: 'bg-cyan-100 text-cyan-800' },
} as const;

function TagBadge({ tag }: { tag: Announcement['tag'] }) {
  if (!tag) return null;
  const s = TAG_STYLE[tag];
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', s.className)}>{s.label}</span>;
}

function AnnouncementCarousel({ items }: { items: Announcement[] }) {
  const [openItem, setOpenItem] = useState<Announcement | null>(null);
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 12)));
  };

  const scrollTo = (i: number) => {
    const el = scroller.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 16, behavior: 'smooth' });
  };

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2"
      >
        {items.map((a) => (
          <article
            key={a.id}
            className="flex w-[86%] max-w-sm shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-white shadow-soft"
          >
            {a.image_url && <img src={a.image_url} alt="" loading="lazy" className="h-36 w-full object-cover" />}
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <TagBadge tag={a.tag} />
                {a.event_date && (
                  <span className="text-[13px] font-semibold text-slate-500">
                    {longDate(a.event_date)}, {weekdayMn(a.event_date)}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold leading-snug text-slate-900">{a.title}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-[15px] leading-relaxed text-slate-600">{a.summary}</p>
              <button
                type="button"
                onClick={() => setOpenItem(a)}
                className="-ml-1 mt-2 inline-flex min-h-11 w-fit items-center gap-1 px-1 text-[15px] font-semibold text-cyan-700 transition active:opacity-60"
              >
                Дэлгэрэнгүй <ChevronRight className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
          {items.map((a, i) => (
            <button
              key={a.id}
              type="button"
              tabIndex={-1}
              onClick={() => scrollTo(i)}
              className={cn('h-2 rounded-full transition-all duration-300', i === index ? 'w-6 bg-cyan-700' : 'w-2 bg-slate-300')}
            />
          ))}
        </div>
      )}

      <Sheet open={!!openItem} onClose={() => setOpenItem(null)} title={openItem?.title ?? ''}>
        {openItem && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <TagBadge tag={openItem.tag} />
              {openItem.event_date && (
                <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-cyan-800">
                  <CalendarDays className="size-4" />
                  {longDate(openItem.event_date)}, {weekdayMn(openItem.event_date)}
                </span>
              )}
            </div>
            {openItem.image_url && (
              <img src={openItem.image_url} alt={openItem.title} className="w-full rounded-2xl" />
            )}
            <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">
              {openItem.body || openItem.summary}
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}

/* --------------------------------------------------------------- Verse */

function pickCurrentVerse(verses: MemoryVerse[]): MemoryVerse | undefined {
  const today = todayISO();
  const past = verses.filter((v) => v.week_start <= today);
  return past.at(-1) ?? verses[0];
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older iOS / non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function VerseSection({ verses }: { verses: MemoryVerse[] }) {
  const toast = useToast();
  const current = pickCurrentVerse(verses);
  if (!current) return null;

  const others = verses.filter((v) => v.id !== current.id);
  const fullText = `"${current.text}" — ${current.reference}`;

  const onCopy = async () => {
    const ok = await copyText(fullText);
    toast(ok ? 'Эшлэл хуулагдлаа' : 'Хуулж чадсангүй', ok ? 'success' : 'error');
  };

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: current.reference, text: fullText });
      } catch {
        /* user cancelled */
      }
    } else {
      await onCopy();
    }
  };

  return (
    <section className="space-y-3">
      <SectionTitle icon={<BookMarked className="size-5" />} title="Цээжлэх эшлэл" />

      <div className="relative overflow-hidden rounded-3xl bg-cyan-50 p-6 text-cyan-950">
        <span className="pointer-events-none absolute -right-1 -top-7 select-none font-serif text-[150px] leading-none text-cyan-200/70" aria-hidden>
          “
        </span>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700/80">Энэ долоо хоногийн эшлэл</p>
        <blockquote className="relative mt-3 font-serif text-[21px] leading-relaxed text-slate-900">{current.text}</blockquote>
        <p className="mt-3 text-base font-bold text-cyan-800">— {current.reference}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-700 font-semibold text-white transition active:scale-[0.97]"
          >
            <Copy className="size-5" /> Хуулах
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Хуваалцах"
            className="grid min-h-12 w-14 place-items-center rounded-2xl bg-white text-cyan-800 shadow-soft transition active:scale-95"
          >
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      {others.length > 0 && (
        <Accordion title="Бусад долоо хоногийн эшлэл" icon={<CalendarDays className="size-5" />}>
          <ul className="divide-y divide-slate-100">
            {others.map((v) => {
              const upcoming = v.week_start > current.week_start;
              return (
                <li key={v.id} className="py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        upcoming ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {upcoming ? 'Удахгүй' : 'Өнгөрсөн'}
                    </span>
                    <span className="text-[13px] text-slate-500">{shortDate(v.week_start)}</span>
                  </div>
                  <p className="font-bold text-slate-900">{v.reference}</p>
                  <p className="text-[15px] leading-relaxed text-slate-600">{v.text}</p>
                </li>
              );
            })}
          </ul>
        </Accordion>
      )}
    </section>
  );
}
