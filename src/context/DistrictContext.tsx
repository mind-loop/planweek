import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { matchesDistrict } from '../lib/utils';

const STORAGE_KEY = 'ubc.district';

interface DistrictContextValue {
  district: string | null;
  setDistrict: (d: string | null) => void;
  /** Does a comma-separated district field include the selected district? */
  isMine: (value: string | null | undefined) => boolean;
}

const DistrictContext = createContext<DistrictContextValue | null>(null);

/** A `?d=21` link (e.g. shared in a district group chat) wins over the saved choice. */
function readStored(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('d');
    if (fromUrl) localStorage.setItem(STORAGE_KEY, fromUrl);
    return fromUrl ?? localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function DistrictProvider({ children }: { children: ReactNode }) {
  const [district, setDistrictState] = useState<string | null>(readStored);

  const setDistrict = useCallback((d: string | null) => {
    setDistrictState(d);
    try {
      if (d) localStorage.setItem(STORAGE_KEY, d);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable (private mode) — selection just won't persist */
    }
  }, []);

  const value = useMemo<DistrictContextValue>(
    () => ({ district, setDistrict, isMine: (v) => matchesDistrict(v, district) }),
    [district, setDistrict],
  );

  return <DistrictContext.Provider value={value}>{children}</DistrictContext.Provider>;
}

export function useDistrict(): DistrictContextValue {
  const ctx = useContext(DistrictContext);
  if (!ctx) throw new Error('useDistrict must be used inside <DistrictProvider>');
  return ctx;
}
