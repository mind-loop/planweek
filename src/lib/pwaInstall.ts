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
