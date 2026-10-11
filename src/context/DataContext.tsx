import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchBulletin, type BulletinResult } from '../lib/supabaseClient';
import { parseDistricts, sortDistricts } from '../lib/utils';

interface DataContextValue {
  result: BulletinResult | null;
  loading: boolean;
  /** True when at least one section is showing sample data. */
  usingMock: boolean;
  /** Every individual district number mentioned in duties or cleaning. */
  districts: string[];
  reload: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<BulletinResult | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const next = await fetchBulletin();
    if (next.errors.length) console.warn('[bulletin] Using fallback data for:', next.errors);
    setResult(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<DataContextValue>(() => {
    const set = new Set<string>();
    result?.data.duties.forEach((d) => parseDistricts(d.district).forEach((x) => set.add(x)));
    result?.data.cleaning.forEach((c) => parseDistricts(c.district).forEach((x) => set.add(x)));
    // Seminar assignees mix districts ("31, 32") with team names ("Хайр баг"); keep numbers only.
    result?.data.seminarDuties.forEach((s) =>
      parseDistricts(s.assignees).forEach((x) => /^\d+$/.test(x) && set.add(x)),
    );
    return {
      result,
      loading,
      usingMock: result ? Object.values(result.sources).includes('mock') : false,
      districts: [...set].sort(sortDistricts),
      reload,
    };
  }, [result, loading, reload]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useBulletin(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useBulletin must be used inside <DataProvider>');
  return ctx;
}
