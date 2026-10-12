import { useState, type ReactNode } from 'react';
import { Check, Copy, Download, Ellipsis, EllipsisVertical, PlusSquare, Share, X } from 'lucide-react';
import { iosBrowser, iosMajor, isInAppBrowser, promptInstall, useInstallMode } from '../lib/pwaInstall';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { Sheet } from './ui';

const DISMISS_KEY = 'ubc.installDismissedAt';
const DISMISS_DAYS = 7;

function wasDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function useInstallAction() {
  const mode = useInstallMode();
  const toast = useToast();
  const [helpOpen, setHelpOpen] = useState(false);

  const install = async () => {
    if (mode === 'prompt') {
      if (await promptInstall()) toast('Апп суулгагдлаа 🎉');
    } else {
      setHelpOpen(true);
    }
  };

  const help = <InstallHelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} ios={mode === 'ios'} />;
  return { mode, install, help };
}

/** One-line hint shown right on the banner, so iPhone users often don't even need the guide. */
function bannerHint(mode: ReturnType<typeof useInstallMode>): string {
  if (mode !== 'ios') return 'Нүүр дэлгэцэнд нэмэх';
  const b = iosBrowser();
  if (b === 'inapp' || b === 'other') return 'Safari дээр нээж суулгана';
  if (b === 'chrome') return 'Дээд талын □↑ → Нүүр дэлгэцэнд нэмэх';
  return iosMajor() >= 26 ? 'Доод талын ⋯ → Хуваалцах → Нүүр дэлгэцэнд нэмэх' : 'Доод талын □↑ → Нүүр дэлгэцэнд нэмэх';
}

/** Dismissible card at the top of the home tab. */
export function InstallBanner() {
  const { mode, install, help } = useInstallAction();
  const [hidden, setHidden] = useState(wasDismissed);

  if (mode === 'installed' || hidden) return help;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="animate-fade-up flex items-center gap-3 rounded-2xl bg-white py-2.5 pl-2.5 pr-1 shadow-soft">
        <img src="/icon-192.png" alt="" className="size-10 shrink-0 rounded-[10px]" />
        <button type="button" onClick={install} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">Апп суулгах</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-tight text-slate-500">{bannerHint(mode)}</p>
        </button>
        <button
          type="button"
          onClick={install}
          className="h-9 shrink-0 rounded-full bg-cyan-700 px-4 text-sm font-semibold text-white transition active:scale-95"
        >
          {mode === 'prompt' ? 'Татах' : 'Заавар'}
        </button>
        <button type="button" onClick={dismiss} aria-label="Хаах" className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 active:bg-slate-100">
          <X className="size-4" />
        </button>
      </div>
      {help}
    </>
  );
}

/** Full-width button (used in the info sheet) — always available until installed. */
export function InstallButton() {
  const { mode, install, help } = useInstallAction();
  if (mode === 'installed') return null;
  return (
    <>
      <button
        type="button"
        onClick={install}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-50 px-4 font-semibold text-cyan-800 ring-1 ring-cyan-100 active:scale-[0.98]"
      >
        <Download className="size-5" /> Апп татах
      </button>
      {help}
    </>
  );
}

/* ------------------------------------------------------------------ guide */

/** Icon drawn like the real iOS button so people can match it on screen. */
function Glyph({ children, label }: { children?: ReactNode; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 align-middle font-semibold text-blue-600 shadow-sm ring-1 ring-slate-200">
      {children}
      {label && <span className="text-[15px] text-slate-900">{label}</span>}
    </span>
  );
}

function Step({ n, title, children }: { n: number; title: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-slate-50 p-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cyan-700 text-sm font-bold text-white">{n}</span>
      <div className="min-w-0 pt-0.5">
        <p className="text-base font-semibold leading-relaxed text-slate-900">{title}</p>
        {children && <div className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{children}</div>}
      </div>
    </li>
  );
}

function CopyLink() {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setDone(true);
      toast('Холбоос хуулагдлаа');
    } catch {
      toast(window.location.origin, 'info');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98]',
        done ? 'bg-emerald-50 text-emerald-700' : 'bg-cyan-700 text-white',
      )}
    >
      {done ? <Check className="size-5" /> : <Copy className="size-5" />} {done ? 'Хуулагдлаа' : 'Холбоос хуулах'}
    </button>
  );
}

const Finish = () => (
  <Step n={3} title={<>Баруун дээд буланд <Glyph label="Нэмэх (Add)" /> дарна</>}>
    Нүүр дэлгэц дээр <b>Чуулганы Мэдээ</b> апп гарч ирнэ. Цаашид түүгээр нээгээрэй.
  </Step>
);

const AddToHome = ({ n = 2 }: { n?: number }) => (
  <Step
    n={n}
    title={
      <>
        Доош гүйлгээд <Glyph label="Нүүр дэлгэцэнд нэмэх">
          <PlusSquare className="size-4" />
        </Glyph>
      </>
    }
  >
    Англиар: <b>Add to Home Screen</b>. «Вэб апп болгон нээх» (Open as Web App) асаалттай байг.
  </Step>
);

function InstallHelpSheet({ open, onClose, ios }: { open: boolean; onClose: () => void; ios: boolean }) {
  const browser = ios ? iosBrowser() : isInAppBrowser() ? 'inapp' : 'android';
  const newSafari = iosMajor() >= 26;

  return (
    <Sheet open={open} onClose={onClose} title="Апп суулгах">
      {browser === 'inapp' || browser === 'other' ? (
        <div className="space-y-3">
          <p className="rounded-2xl bg-amber-50 p-3.5 text-[15px] leading-relaxed text-amber-900">
            {browser === 'inapp' ? 'Messenger, Facebook дотроос апп суулгах боломжгүй.' : 'Энэ хөтчөөс апп суулгах боломжгүй.'} Холбоосыг{' '}
            <b>{ios ? 'Safari' : 'Chrome'}</b> дээр нээнэ үү.
          </p>
          <ol className="space-y-2.5">
            <Step
              n={1}
              title={
                <>
                  <Glyph>
                    <Ellipsis className="size-4" />
                  </Glyph>{' '}
                  цэснээс <b>«{ios ? 'Safari-д нээх' : 'Chrome-д нээх'}»</b>-г сонгоно
                </>
              }
            >
              Олдохгүй бол доорх товчоор холбоосыг хуулаад {ios ? 'Safari' : 'Chrome'}-ийн хаягийн мөрөнд буулгана.
            </Step>
            <Step n={2} title="Нээгдсэн хуудсан дээр «Апп суулгах» дахин дарна" />
          </ol>
          <CopyLink />
        </div>
      ) : browser === 'chrome' ? (
        <ol className="space-y-2.5">
          <Step
            n={1}
            title={
              <>
                Хаягийн мөрний баруун талд{' '}
                <Glyph>
                  <Share className="size-4" />
                </Glyph>{' '}
                дарна
              </>
            }
          />
          <AddToHome />
          <Finish />
        </ol>
      ) : browser === 'safari' ? (
        <ol className="space-y-2.5">
          <Step
            n={1}
            title={
              newSafari ? (
                <>
                  Доод талын{' '}
                  <Glyph>
                    <Ellipsis className="size-4" />
                  </Glyph>{' '}
                  → <Glyph label="Хуваалцах">
                    <Share className="size-4" />
                  </Glyph>
                </>
              ) : (
                <>
                  Доод талын{' '}
                  <Glyph label="Хуваалцах">
                    <Share className="size-4" />
                  </Glyph>{' '}
                  товчийг дарна
                </>
              )
            }
          >
            {newSafari ? (
              <>Хуучин iPhone дээр шууд доод талын □↑ товч байдаг.</>
            ) : (
              <>
                Товч харагдахгүй бол хуудсыг бага зэрэг доош гүйлгэ. iPad дээр дээд буланд байна.
              </>
            )}
          </Step>
          <AddToHome />
          <Finish />
        </ol>
      ) : (
        <ol className="space-y-2.5">
          <Step
            n={1}
            title={
              <>
                Хөтчийн баруун дээд буланд{' '}
                <Glyph>
                  <EllipsisVertical className="size-4" />
                </Glyph>{' '}
                цэсийг дарна
              </>
            }
          />
          <Step n={2} title={<><Glyph label="Апп суулгах" /> эсвэл <Glyph label="Нүүр дэлгэцэнд нэмэх" /> сонгоно</>}>
            Англиар: <b>Install app</b> / <b>Add to Home screen</b>
          </Step>
          <Step n={3} title={<><Glyph label="Суулгах" /> дарна</>} />
        </ol>
      )}
    </Sheet>
  );
}
