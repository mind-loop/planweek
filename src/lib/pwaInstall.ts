import { useSyncExternalStore } from 'react';

/** Chrome/Edge/Samsung Internet event — not in the TS DOM lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode =
  /** Already running as an installed app. */
  | 'installed'
  /** Browser offered a native install prompt (Android Chrome, desktop Chrome/Edge). */
  | 'prompt'
  /** iPhone/iPad Safari: must use Share → Add to Home Screen. */
  | 'ios'
  /** Install possible only from the browser menu (or not supported). */
  | 'manual';

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Registered at import time (from main.tsx) so an early event isn't missed.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS reports itself as Mac
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Messenger/Facebook/Instagram etc. open links in a webview that cannot install apps. */
export const isInAppBrowser = () => /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|KAKAOTALK|Telegram|WhatsApp/i.test(navigator.userAgent);

/** Which iPhone/iPad browser — each hides "Add to Home Screen" in a different place. */
export type IOSBrowser = 'safari' | 'chrome' | 'inapp' | 'other';
export function iosBrowser(): IOSBrowser {
  const ua = navigator.userAgent;
  if (isInAppBrowser()) return 'inapp';
  if (/CriOS/i.test(ua)) return 'chrome';
  if (/FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/i.test(ua)) return 'other';
  return 'safari';
}

/** Safari 26 (iOS 26) moved Share into the "⋯" menu; older versions have it in the toolbar. */
export function iosMajor(): number {
  const m = navigator.userAgent.match(/OS (\d+)_/);
  const v = navigator.userAgent.match(/Version\/(\d+)/);
  return Math.max(m ? Number(m[1]) : 0, v ? Number(v[1]) : 0);
}

function getMode(): InstallMode {
  if (installedNow || isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIOS()) return 'ios';
  return 'manual';
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, getMode, () => 'manual');
}

/** Shows the native prompt. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const evt = deferred;
  deferred = null; // a prompt event can only be used once
  emit();
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  return outcome === 'accepted';
}
