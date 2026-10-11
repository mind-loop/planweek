import { Baby, BookOpen, Church, HandHeart, Sparkles, Users, type LucideIcon } from 'lucide-react';
import { useBulletin } from '../../context/DataContext';
import { cn, todayISO, weekdayMn } from '../../lib/utils';
import { Card, SectionTitle } from '../../components/ui';

/** Picks an icon/colour from keywords in the group name so admins don't have to. */
function groupStyle(name: string): { icon: LucideIcon; tint: string } {
  const n = name.toLowerCase();
  if (n.includes('эзний')) return { icon: Church, tint: 'bg-cyan-50 text-cyan-700' };
  if (n.includes('лхагва')) return { icon: BookOpen, tint: 'bg-violet-50 text-violet-700' };
  if (n.includes('залуу')) return { icon: Sparkles, tint: 'bg-orange-50 text-orange-600' };
  if (n.includes('бага') || n.includes('хүүхэд')) return { icon: Baby, tint: 'bg-pink-50 text-pink-600' };
  if (n.includes('ээж') || n.includes('эмэгт')) return { icon: HandHeart, tint: 'bg-rose-50 text-rose-600' };
  return { icon: Users, tint: 'bg-emerald-50 text-emerald-700' };
}

/** Нөхөрлөл — weekly groups; today's meetings float to the top. */
export function FellowshipSection() {
  const { result } = useBulletin();
  const groups = result?.data.fellowship ?? [];
  if (groups.length === 0) return null;

  const todayName = weekdayMn(todayISO());
  const sorted = [...groups].sort(
    (a, b) => Number(b.day_of_week.trim() === todayName) - Number(a.day_of_week.trim() === todayName),
  );

  return (
    <section>
      <SectionTitle icon={<Users className="size-5" />} title="Нөхөрлөл" />
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {sorted.map((g) => {
          const { icon: Icon, tint } = groupStyle(g.group_name);
          const isToday = g.day_of_week.trim() === todayName;
          return (
            <div key={g.id} className={cn('flex items-center gap-3 px-4 py-3.5', isToday && 'bg-cyan-50/50')}>
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', tint)}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{g.group_name}</p>
                <p className="truncate text-sm text-slate-500">
                  {[g.location, g.leader].filter(Boolean).join(' · ') || g.notes}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15px] font-bold text-slate-900">{g.time}</p>
                {isToday ? (
                  <p className="text-xs font-bold text-cyan-700">Өнөөдөр</p>
                ) : (
                  <p className="text-xs font-medium text-slate-500">{g.day_of_week}</p>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
