import { CalendarDays, Handshake, House, SprayCan, Users, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export type TabId = 'home' | 'plan' | 'duty' | 'fellowship' | 'cleaning';

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Нүүр', icon: House },
  { id: 'plan', label: 'Төлөвлөгөө', icon: CalendarDays },
  { id: 'duty', label: 'Үйлчлэл', icon: Handshake },
  { id: 'fellowship', label: 'Нөхөрлөл', icon: Users },
  { id: 'cleaning', label: 'Цэвэрлэгээ', icon: SprayCan },
];

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav
      aria-label="Үндсэн цэс"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/90 backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className="group flex min-h-16 w-full flex-col items-center justify-center gap-1 px-0.5 pt-1.5 pb-1"
              >
                <span
                  className={cn(
                    'grid h-8 w-14 place-items-center rounded-full transition-all duration-300',
                    isActive ? 'bg-cyan-100 text-cyan-800' : 'text-slate-500 group-active:scale-90',
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                </span>
                <span
                  className={cn(
                    'max-w-full truncate text-[12px] leading-none tracking-tight transition-colors',
                    isActive ? 'font-bold text-cyan-800' : 'font-medium text-slate-600',
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
