import { useState } from 'react';
import { Check } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { cn } from '../lib/utils';
import { Sheet } from './ui';

const ASKED_KEY = 'ubc.districtAsked';

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    /* ignore */
  }
}

function alreadyAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return true; // no storage → don't nag on every visit
  }
}

/** District picker sheet. The choice lives only on this device (localStorage). */
export function DistrictSheet({ open, onClose, welcome = false }: { open: boolean; onClose: () => void; welcome?: boolean }) {
  const { districts } = useBulletin();
  const { district, setDistrict } = useDistrict();

  const pick = (d: string | null) => {
    setDistrict(d);
    markAsked();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={welcome ? 'Тавтай морил 🙏' : 'Миний дүүрэг'}>
      <p className="text-[15px] leading-relaxed text-slate-500">
        {welcome
          ? 'Та аль дүүрэгт харьяалагддаг вэ? Танай дүүргийн үйлчлэл, цэвэрлэгээг тодруулж харуулна.'
          : 'Сонгосон дүүргийн үүргүүд бүх хэсэгт тодорч харагдана.'}
      </p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {districts.map((d) => {
          const on = d === district;
          return (
            <button
              key={d}
              type="button"
              onClick={() => pick(d)}
              aria-pressed={on}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-2xl transition active:scale-95',
                on ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-800',
              )}
            >
              <span className="text-xl font-bold leading-none">{d}</span>
              <span className={cn('mt-1 text-[11px] font-medium', on ? 'text-cyan-100' : 'text-slate-500')}>дүүрэг</span>
              {on && <Check className="absolute right-1.5 top-1.5 size-3.5" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => (welcome ? (markAsked(), onClose()) : pick(null))}
        className="mt-4 min-h-12 w-full rounded-2xl text-[15px] font-semibold text-slate-500 active:bg-slate-100"
      >
        {welcome ? 'Дараа сонгох' : 'Сонголтыг арилгах'}
      </button>
      <p className="mt-1 text-center text-xs text-slate-400">Зөвхөн энэ утсанд хадгалагдана</p>
    </Sheet>
  );
}

/** Asks once, on the very first visit. */
export function DistrictWelcome() {
  const { districts, loading } = useBulletin();
  const { district } = useDistrict();
  const [done, setDone] = useState(alreadyAsked);
  const open = !done && !loading && !district && districts.length > 0;

  return (
    <DistrictSheet
      welcome
      open={open}
      onClose={() => {
        markAsked();
        setDone(true);
      }}
    />
  );
}
