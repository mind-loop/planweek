import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { Sheet } from './ui';

const ASKED_KEY = 'ubc.districtAsked';

function alreadyAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return true; // no storage → don't nag on every visit
  }
}

/** One-time first-visit question. The answer stays on the device (localStorage) only. */
export function DistrictWelcome() {
  const { districts, loading } = useBulletin();
  const { district, setDistrict } = useDistrict();
  const [done, setDone] = useState(alreadyAsked);

  const open = !done && !loading && !district && districts.length > 0;

  const finish = (d: string | null) => {
    if (d) setDistrict(d);
    try {
      localStorage.setItem(ASKED_KEY, '1');
    } catch {
      /* ignore */
    }
    setDone(true);
  };

  return (
    <Sheet open={open} onClose={() => finish(null)} title="Тавтай морил! 🙏">
      <p className="text-base leading-relaxed text-slate-600">
        Та аль дүүрэгт харьяалагддаг вэ? Сонговол танай дүүргийн гал тогоо, хүүхэд харах, цэвэрлэгээний үүргийг тодруулж харуулна.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {districts.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => finish(d)}
            className="flex min-h-14 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-lg font-bold text-slate-800 transition active:scale-95 active:bg-cyan-700 active:text-white"
          >
            <MapPin className="size-4 text-cyan-700" /> {d}-р
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => finish(null)}
        className="mt-4 min-h-12 w-full rounded-2xl text-[15px] font-semibold text-slate-500 active:bg-slate-100"
      >
        Дараа сонгох
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">Зөвхөн энэ утсанд хадгалагдана. Дээд хэсгээс хүссэн үедээ солино.</p>
    </Sheet>
  );
}
