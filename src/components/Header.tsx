import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, MapPin, Phone } from 'lucide-react';
import { useBulletin } from '../context/DataContext';
import { useDistrict } from '../context/DistrictContext';
import { useToast } from '../context/ToastContext';
import { cn, shortDate } from '../lib/utils';
import { Sheet, Skeleton } from './ui';
import { InstallButton } from './InstallApp';

const ADMIN_TAP_COUNT = 5;

export function Header() {
  const { result, loading } = useBulletin();
  const [mapOpen, setMapOpen] = useState(false);
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
    <header className="pt-safe sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={onLogoTap}
          aria-label="Чуулганы лого"
          className="grid size-10 shrink-0 place-items-center active:scale-95"
        >
          <img src="/logo.png" alt="" className="size-10 object-contain" draggable={false} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-slate-900">
            {info?.church_name ?? 'УВС БАПТИСТ ЧУУЛГАН'}
          </h1>
          {loading && !info ? (
            <Skeleton className="mt-1 h-4 w-40" />
          ) : (
            <p className="mt-0.5 truncate text-[12.5px] font-medium text-slate-500">
              Пастор {info?.pastor} · №{info?.issue_no} · {info && shortDate(info.issue_date)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onCall}
          aria-label="Чуулган руу залгах"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-700 transition active:scale-95"
        >
          <Phone className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          aria-label="Байршил харах"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-700 transition active:scale-95"
        >
          <MapPin className="size-5" />
        </button>
      </div>

      <DistrictSelector />

      <Sheet open={mapOpen} onClose={() => setMapOpen(false)} title="Чуулганы байршил">
        <img
          src="/church.jpg"
          alt="Увс Баптист Чуулганы барилга"
          className="aspect-4/3 w-full rounded-2xl object-cover"
          loading="lazy"
        />
        {info?.address && (
          <p className="mt-4 flex items-start gap-2 text-base text-slate-700">
            <MapPin className="mt-0.5 size-5 shrink-0 text-cyan-700" />
            {info.address}
          </p>
        )}
        <div className="mt-4 grid gap-2">
          {info?.map_url && (
            <a
              href={info.map_url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 font-semibold text-white shadow-sm active:scale-[0.98]"
            >
              <ExternalLink className="size-5" /> Газрын зураг дээр нээх
            </a>
          )}
          <button
            type="button"
            onClick={onCall}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 font-semibold text-slate-800 active:scale-[0.98]"
          >
            <Phone className="size-5" /> {info?.phone ?? 'Залгах'}
          </button>
          <InstallButton />
        </div>
      </Sheet>
    </header>
  );
}

function DistrictSelector() {
  const { districts } = useBulletin();
  const { district, setDistrict } = useDistrict();
  const toast = useToast();
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the selected pill visible, e.g. "31-р" on a narrow phone.
  useEffect(() => {
    const row = rowRef.current;
    const pill = row?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (row && pill) row.scrollLeft = pill.offsetLeft - row.clientWidth / 2 + pill.offsetWidth / 2;
  }, [district, districts.length]);

  if (districts.length === 0) return null;

  const pick = (d: string | null) => {
    setDistrict(d);
    if (d) toast(`${d}-р дүүргийн үүргүүдийг тодруулж байна`, 'info');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div
        role="radiogroup"
        aria-label="Миний дүүрэг"
        ref={rowRef}
        className="no-scrollbar relative flex gap-2 overflow-x-auto scroll-smooth px-4 pb-2.5"
      >
        <span className="flex shrink-0 items-center pr-1 text-[13px] font-semibold text-slate-500">Дүүрэг:</span>
        <Pill active={district === null} onClick={() => pick(null)}>
          Бүгд
        </Pill>
        {districts.map((d) => (
          <Pill key={d} active={district === d} onClick={() => pick(d)}>
            {d}-р
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-all duration-200 active:scale-95',
        active
          ? 'bg-cyan-700 text-white shadow-md shadow-cyan-900/20'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}
