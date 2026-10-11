import { useRef, useState } from 'react';
import { ExternalLink, Info, MapPin, Phone } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { Sheet, Skeleton } from './ui';
import { InstallButton } from './InstallApp';
import { DistrictSheet } from './DistrictWelcome';

const ADMIN_TAP_COUNT = 5;

export function Header() {
  const { result, loading, districts } = useBulletin();
  const { district } = useDistrict();
  const [infoOpen, setInfoOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const toast = useToast();
  const taps = useRef<number[]>([]);
  const info = result?.data.churchInfo;

  // Secret admin entry: tap the logo 5 times within 2 seconds.
  const onLogoTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2000), now];
    if (taps.current.length >= ADMIN_TAP_COUNT) {
      taps.current = [];
      window.location.hash = '#/admin';
    }
  };

  const onCall = () => {
    if (info?.phone) window.location.href = `tel:${info.phone.replace(/\s+/g, '')}`;
    else toast('Утасны дугаар хараахан оруулаагүй байна', 'info');
  };

  return (
    <header className="pt-safe sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
        <button type="button" onClick={onLogoTap} aria-label="Чуулганы лого" className="shrink-0 active:scale-95">
          <img src="/logo.png" alt="" className="size-9 object-contain" draggable={false} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[14px] font-bold leading-tight tracking-tight text-slate-900">
            {info?.church_name ?? 'УВС БАПТИСТ ЧУУЛГАН'}
          </h1>
          {loading && !info ? (
            <Skeleton className="mt-1 h-3.5 w-28" />
          ) : (
            <p className="truncate text-xs text-slate-500">Пастор {info?.pastor}</p>
          )}
        </div>

        {districts.length > 0 && (
          <button
            type="button"
            onClick={() => setDistrictOpen(true)}
            aria-label={district ? `Миний дүүрэг: ${district}` : 'Дүүрэг сонгох'}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold transition active:scale-95',
              district ? 'bg-cyan-700 text-white' : 'bg-white text-slate-700 shadow-soft',
            )}
          >
            <MapPin className="size-4" />
            {district ?? 'Дүүрэг'}
          </button>
        )}

        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label="Байршил, холбоо барих"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-slate-600 shadow-soft transition active:scale-95"
        >
          <Info className="size-5" />
        </button>
      </div>

      <DistrictSheet open={districtOpen} onClose={() => setDistrictOpen(false)} />

      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title="Чуулганы тухай">
        <img src="/church.jpg" alt="Увс Баптист Чуулганы барилга" className="aspect-16/10 w-full rounded-2xl object-cover" loading="lazy" />
        {info?.address && (
          <p className="mt-4 flex items-start gap-2 text-[15px] text-slate-600">
            <MapPin className="mt-0.5 size-5 shrink-0 text-slate-400" />
            {info.address}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCall}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold text-slate-800 active:scale-[0.98]"
          >
            <Phone className="size-5" /> Залгах
          </button>
          {info?.map_url ? (
            <a
              href={info.map_url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-700 font-semibold text-white active:scale-[0.98]"
            >
              <ExternalLink className="size-5" /> Газрын зураг
            </a>
          ) : (
            <span />
          )}
        </div>
        <div className="mt-2">
          <InstallButton />
        </div>
      </Sheet>
    </header>
  );
}
