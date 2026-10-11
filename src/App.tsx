import { useCallback, useEffect, useState } from 'react';
import { Info, WifiOff } from 'lucide-react';
import { useBulletin } from './context/DataContext';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { Header } from './components/Header';
import { BottomNav, TABS, type TabId } from './components/BottomNav';
import { PageSkeleton } from './components/ui';
import { DistrictWelcome } from './components/DistrictWelcome';
import { HomePage } from './pages/HomePage';
import { PlanPage } from './pages/PlanPage';
import { AdminApp } from './admin/AdminApp';

type Route = TabId | 'admin';

function readRoute(): Route {
  const r = window.location.hash.replace(/^#\/?/, '');
  if (r === 'admin') return 'admin';
  return TABS.some((t) => t.id === r) ? (r as TabId) : 'home';
}

/** Tab state lives in the URL hash so the Android back button walks tab history. */
function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((r: Route) => {
    if (r !== readRoute()) window.location.hash = `#/${r}`;
  }, []);
  return [route, navigate];
}

export default function App() {
  const [route, navigate] = useHashRoute();
  const { loading, result, usingMock, reload } = useBulletin();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route]);

  // Refresh when the app is brought back to the foreground (common for installed PWAs).
  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > 5 * 60_000) {
        last = Date.now();
        void reload();
      }
    };
    const setOn = () => setOnline(true);
    const setOff = () => setOnline(false);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', setOn);
    window.addEventListener('offline', setOff);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', setOn);
      window.removeEventListener('offline', setOff);
    };
  }, [reload]);

  if (route === 'admin') return <AdminApp />;

  const tab = route;

  return (
    <div className="min-h-dvh">
      <Header />

      <main className="mx-auto max-w-2xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4">
        {!online && (
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-white">
            <WifiOff className="size-4" /> Офлайн — сүүлд хадгалсан мэдээг харуулж байна
          </p>
        )}
        {import.meta.env.DEV && !loading && usingMock && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            <Info className="mt-0.5 size-4 shrink-0" />
            {isSupabaseConfigured
              ? 'Зарим хэсэгт мэдээлэл ороогүй тул жишээ өгөгдөл харуулж байна.'
              : 'Жишээ өгөгдөл — Supabase холбогдоогүй байна.'}
          </p>
        )}

        {loading && !result ? (
          <PageSkeleton />
        ) : (
          <div key={tab} className="animate-fade-up">
            {tab === 'home' && <HomePage onNavigate={navigate} />}
            {tab === 'plan' && <PlanPage />}
          </div>
        )}
      </main>

      <BottomNav active={tab} onChange={navigate} />
      <DistrictWelcome />
    </div>
  );
}
