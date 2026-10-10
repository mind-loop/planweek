import { Baby, BookOpen, Church, Clock, HandHeart, MapPin, Sparkles, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { cn, todayISO, weekdayMn } from '../lib/utils';
import type { FellowshipSchedule } from '../types/database';
import { Card, EmptyState, InfoLine, SectionTitle } from '../components/ui';

/** Picks an icon/colour from keywords in the group name so admins don't have to. */
function groupStyle(name: string): { icon: LucideIcon; tint: string } {
  const n = name.toLowerCase();
  if (n.includes('эзний')) return { icon: Church, tint: 'from-cyan-600 to-cyan-800' };
  if (n.includes('лхагва')) return { icon: BookOpen, tint: 'from-violet-500 to-violet-700' };
  if (n.includes('залуу')) return { icon: Sparkles, tint: 'from-orange-400 to-rose-500' };
  if (n.includes('бага') || n.includes('хүүхэд')) return { icon: Baby, tint: 'from-pink-400 to-pink-600' };
  if (n.includes('ээж') || n.includes('эмэгт')) return { icon: HandHeart, tint: 'from-rose-400 to-fuchsia-600' };
  return { icon: Users, tint: 'from-emerald-500 to-teal-700' };
}

export function FellowshipPage() {
  const { result } = useBulletin();
  const groups = result?.data.fellowship ?? [];
  const todayName = weekdayMn(todayISO());

  return (
    <div>
      <SectionTitle icon={<Users className="size-5" />} title="Нөхөрлөлийн хуваарь" />
      {groups.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="Хуваарь оруулаагүй байна" />
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <GroupCard key={g.id} group={g} isToday={g.day_of_week.trim() === todayName} delay={i * 50} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group, isToday, delay }: { group: FellowshipSchedule; isToday: boolean; delay: number }) {
  const { icon: Icon, tint } = groupStyle(group.group_name);
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <Card className={cn('flex gap-4 p-4', isToday && 'ring-2 ring-cyan-600')}>
        <div className={cn('flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-linear-to-br py-3 text-white shadow-sm', tint)}>
          <Icon className="mb-1 size-6" />
          <span className="text-sm font-bold">{group.day_of_week}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[17px] font-bold leading-snug text-slate-900">{group.group_name}</h3>
            {isToday && (
              <span className="animate-pop shrink-0 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800">Өнөөдөр</span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xl font-extrabold text-cyan-800">
            <Clock className="size-5" /> {group.time}
          </p>
          <div className="mt-1.5 space-y-1">
            {group.location && <InfoLine icon={<MapPin />}>{group.location}</InfoLine>}
            {group.leader && <InfoLine icon={<UserRound />}>{group.leader}</InfoLine>}
          </div>
          {group.notes && <p className="mt-2 text-sm text-slate-500">{group.notes}</p>}
        </div>
      </Card>
    </div>
  );
}
