import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { InstallBanner } from '../components/InstallApp';
import { issueNumber, longDate, todayISO, upcomingSunday, weekdayMn } from '../lib/utils';
import type { Announcement } from '../types/database';
import type { TabId } from '../components/BottomNav';
import { HomeBanner } from './home/HomeBanner';
import { VerseSection } from './home/VerseSection';
import { WeekProgramSection } from './home/WeekProgramSection';
import { ServiceSection } from './home/ServiceSection';
import { CleaningSection } from './home/CleaningSection';
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
export function HomePage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { result } = useBulletin();
  const [openItem, setOpenItem] = useState<Announcement | null>(null);
  if (!result) return null;
  const { churchInfo, announcements, verses } = result.data;

  // Banner shows only banner images; every announcement lives in Зарлал (Онцлох, Семинар first).
  const rank = (a: Announcement) => (a.tag === 'featured' ? 0 : a.tag === 'seminar' ? 1 : 2);
  const notices = [...announcements].sort((a, b) => rank(a) - rank(b));
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

      <HomeBanner />

      <VerseSection verses={verses} />

      <WeekProgramSection onNavigate={onNavigate} />

      <ServiceSection />

      <CleaningSection />

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
