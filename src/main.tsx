import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Registers beforeinstallprompt listener before React renders.
import './lib/pwaInstall';
import { registerSW } from 'virtual:pwa-register';

// Installed apps (iPhone especially) can stay open for days: look for a new
// version on launch, whenever the app comes back to the foreground, and hourly.
// In autoUpdate mode a new version activates and the page reloads by itself.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => void registration.update().catch(() => {});
    window.setInterval(check, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});
import App from './App';
import { DataProvider } from './context/DataContext';
import { DistrictProvider } from './context/DistrictContext';
import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <DistrictProvider>
          <App />
        </DistrictProvider>
      </DataProvider>
    </ToastProvider>
  </StrictMode>,
);
