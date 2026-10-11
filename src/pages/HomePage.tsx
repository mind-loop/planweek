import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { InstallBanner } from '../components/InstallApp';
import { issueNumber, longDate, todayISO, upcomingSunday, weekdayMn } from '../lib/utils';
import type { Announcement } from '../types/database';
import { HomeBanner } from './home/HomeBanner';
import { VerseSection } from './home/VerseSection';
import { FellowshipSection } from './home/FellowshipSection';
import { ServiceSection } from './home/ServiceSection';
import { AnnouncementSheet, NoticesSection } from './home/Notices';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Өглөөний мэнд';
  if (h < 18) return 'Өдрийн мэнд';
  return 'Оройн мэнд';
}

/**
 * Everything on one page, in the order of the paper sketch:
 * greeting → banner (онцлох + семинар) → эшлэл → нөхөрлөл → үйлчлэл → зарлал.
 */
export function HomePage() {
  const { result } = useBulletin();
  const [openItem, setOpenItem] = useState<Announcement | null>(null);
  if (!result) return null;
  const { churchInfo, announcements, verses } = result.data;

  // «Онцлох» and «Семинар» announcements go to the banner; the rest to Зарлал.
  const featured = announcements.filter((a) => a.tag === 'featured' || a.tag === 'seminar');
  const notices = announcements.filter((a) => a.tag !== 'featured' && a.tag !== 'seminar');
  const today = todayISO();

  return (
    <div className="space-y-8">
      <section className="px-1 pt-2">
        <p className="text-sm font-medium text-slate-500">
          {weekdayMn(today)}, {longDate(today)} · Дугаар №{issueNumber(upcomingSunday(today))}
        </p>
        <h2 className="mt-1 text-[28px] font-bold leading-tight tracking-tight text-slate-900">{greeting()} 👋</h2>
      </section>

      <InstallBanner />

      <HomeBanner featured={featured} onOpenAnnouncement={setOpenItem} />

      <VerseSection verses={verses} />

      <FellowshipSection />

      <ServiceSection />

      <NoticesSection items={notices} onOpen={setOpenItem} />

      <footer className="flex flex-col items-center gap-1 pt-2 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {churchInfo.church_name}</p>
        {/* Deliberately faint: the only visible way into the admin panel. */}
        <a href="#/admin" aria-label="Нэвтрэх" className="grid size-10 place-items-center rounded-full text-slate-300 transition active:text-slate-500">
          <Lock className="size-3.5" />
        </a>
      </footer>

      <AnnouncementSheet item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  );
}
