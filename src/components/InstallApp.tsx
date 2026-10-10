import { useState, type ReactNode } from 'react';
import { Download, EllipsisVertical, PlusSquare, Share, X } from 'lucide-react';
import { promptInstall, useInstallMode } from '../lib/pwaInstall';
import { useToast } from '../context/ToastContext';
import { Sheet } from './ui';

const DISMISS_KEY = 'ubc.installDismissedAt';
const DISMISS_DAYS = 7;

/** Messenger/Facebook/Instagram etc. open links in a webview that cannot install apps. */
const isInAppBrowser = () => /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|KAKAOTALK|Telegram|WhatsApp/i.test(navigator.userAgent);

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
      <div className="animate-fade-up relative flex items-center gap-3 rounded-2xl bg-white p-3 pr-2 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_rgb(15_23_42/0.06)] ring-1 ring-cyan-100">
        <img src="/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl ring-1 ring-slate-200" />
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight text-slate-900">Апп татах</p>
          <p className="mt-0.5 text-sm leading-snug text-slate-500">Нүүр дэлгэцэндээ нэмээд интернетгүй ч уншаарай</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-cyan-700 px-3.5 text-[15px] font-semibold text-white shadow-sm transition active:scale-95"
        >
          <Download className="size-4" /> Татах
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Хаах"
          className="grid size-11 shrink-0 place-items-center rounded-full text-slate-400 active:bg-slate-100"
        >
          <X className="size-5" />
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

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cyan-700 text-sm font-bold text-white">{n}</span>
      <span className="pt-1 text-base leading-relaxed text-slate-700">{children}</span>
    </li>
  );
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <span className="mx-0.5 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-900">{children}</span>
);

function InstallHelpSheet({ open, onClose, ios }: { open: boolean; onClose: () => void; ios: boolean }) {
  const inApp = isInAppBrowser();
  return (
    <Sheet open={open} onClose={onClose} title="Апп татах заавар">
      {inApp ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-amber-50 p-3 text-[15px] text-amber-900">
            Messenger, Facebook зэрэг апп дотроос суулгах боломжгүй. Эхлээд {ios ? 'Safari' : 'Chrome'} дээр нээнэ үү.
          </p>
          <ol className="space-y-4">
            <Step n={1}>
              Баруун дээд/доод буланд байрлах <Kbd>⋯</Kbd> цэсийг дарна.
            </Step>
            <Step n={2}>
              <Kbd>{ios ? 'Open in Safari' : 'Open in Chrome'}</Kbd> буюу «Хөтөч дээр нээх»-г сонгоно.
            </Step>
            <Step n={3}>Нээгдсэн хуудсан дээр «Татах» товчийг дахин дарна.</Step>
          </ol>
        </div>
      ) : ios ? (
        <ol className="space-y-4">
          <Step n={1}>
            Safari-н доод талын <Kbd><Share className="size-4" /> Хуваалцах</Kbd> товчийг дарна.
          </Step>
          <Step n={2}>
            Доош гүйлгээд <Kbd><PlusSquare className="size-4" /> Add to Home Screen</Kbd> («Нүүр дэлгэцэнд нэмэх»)-г сонгоно.
          </Step>
          <Step n={3}>
            Баруун дээд буланд <Kbd>Add</Kbd> («Нэмэх») дарна. Апп нүүр дэлгэц дээр гарч ирнэ.
          </Step>
        </ol>
      ) : (
        <ol className="space-y-4">
          <Step n={1}>
            Хөтчийн баруун дээд буланд <Kbd><EllipsisVertical className="size-4" /></Kbd> цэсийг дарна.
          </Step>
          <Step n={2}>
            <Kbd>Install app</Kbd> эсвэл <Kbd>Add to Home screen</Kbd> («Апп суулгах»)-г сонгоно.
          </Step>
          <Step n={3}>
            <Kbd>Install</Kbd> («Суулгах») дарна.
          </Step>
        </ol>
      )}
    </Sheet>
  );
}
