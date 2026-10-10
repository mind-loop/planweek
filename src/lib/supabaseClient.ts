import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BulletinData, ChurchInfo } from '../types/database';
import { buildMockData } from './mockData';
import { addDays, firstOfMonth, todayISO } from './utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** `null` when env vars are missing — the app then runs entirely on mock data. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export type DataSource = 'live' | 'mock';
export type SourceMap = Record<keyof BulletinData, DataSource>;

export interface BulletinResult {
  data: BulletinData;
  sources: SourceMap;
  /** Human-readable problems (network, missing table, RLS…) — never thrown. */
  errors: string[];
}

interface QueryResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Runs a query; empty results or errors fall back to the mock rows. */
async function withFallback<T>(
  label: string,
  query: PromiseLike<QueryResponse<T[]>> | null,
  fallback: T[],
  errors: string[],
): Promise<[T[], DataSource]> {
  if (!query) return [fallback, 'mock'];
  try {
    const { data, error } = await query;
    if (error) {
      errors.push(`${label}: ${error.message}`);
      return [fallback, 'mock'];
    }
    return data && data.length > 0 ? [data, 'live'] : [fallback, 'mock'];
  } catch (err) {
    errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    return [fallback, 'mock'];
  }
}

/** Loads every bulletin section in parallel. Never rejects. */
export async function fetchBulletin(): Promise<BulletinResult> {
  const mock = buildMockData();
  const errors: string[] = [];
  const db = supabase;
  const today = todayISO();

  const [
    [infoRows, infoSrc],
    [announcements, annSrc],
    [verses, verseSrc],
    [plans, planSrc],
    [duties, dutySrc],
    [fellowship, fellowSrc],
    [cleaning, cleanSrc],
  ] = await Promise.all([
    withFallback<ChurchInfo>('church_info', db && db.from('church_info').select('*').order('id').limit(1), [mock.churchInfo], errors),
    withFallback(
      'announcements',
      db &&
        db
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
      mock.announcements,
      errors,
    ),
    withFallback('memory_verses', db && db.from('memory_verses').select('*').order('week_start', { ascending: true }), mock.verses, errors),
    withFallback(
      'monthly_plans',
      db && db.from('monthly_plans').select('*').gte('event_date', firstOfMonth(today)).order('event_date').limit(120),
      mock.plans,
      errors,
    ),
    withFallback(
      'service_duties',
      db && db.from('service_duties').select('*').gte('week_date', addDays(today, -7)).order('week_date'),
      mock.duties,
      errors,
    ),
    withFallback('fellowship_schedules', db && db.from('fellowship_schedules').select('*').order('sort_order'), mock.fellowship, errors),
    withFallback('cleaning_schedules', db && db.from('cleaning_schedules').select('*').order('sort_order'), mock.cleaning, errors),
  ]);

  return {
    data: {
      churchInfo: infoRows[0],
      announcements,
      verses,
      plans,
      duties,
      fellowship,
      cleaning: cleaning.map((c) => ({ ...c, tasks: c.tasks ?? [] })),
    },
    sources: {
      churchInfo: infoSrc,
      announcements: annSrc,
      verses: verseSrc,
      plans: planSrc,
      duties: dutySrc,
      fellowship: fellowSrc,
      cleaning: cleanSrc,
    },
    errors,
  };
}
