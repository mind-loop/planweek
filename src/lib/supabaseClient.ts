import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BulletinData, ChurchInfo } from '../types/database';
import { buildMockData } from './mockData';
import { addDays, firstOfMonth, todayISO } from './utils';
import { loadVerseBook, rotationVerses, weekSunday } from './verseBook';

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
  // In production an empty section stays empty instead of showing invented names.
  const sample: BulletinData =
    !isSupabaseConfigured || import.meta.env.DEV
      ? mock
      : { ...mock, announcements: [], verses: [], plans: [], duties: [], seminars: [], seminarDuties: [], cleaning: [], banners: [] };
  const errors: string[] = [];
  const db = supabase;
  const today = todayISO();
  // Started right away (cached + precached); only used when an anchor verse is set.
  const verseBook = loadVerseBook().catch((e: unknown) => e);

  const [
    [infoRows, infoSrc],
    [announcements, annSrc],
    [verses, verseSrc],
    [plans, planSrc],
    [duties, dutySrc],
    [cleaning, cleaningSrc],
    [banners, bannerSrc],
    [seminars, seminarSrc],
    [seminarDuties, seminarDutySrc],
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
      sample.announcements,
      errors,
    ),
    withFallback('memory_verses', db && db.from('memory_verses').select('*').order('week_start', { ascending: true }), sample.verses, errors),
    withFallback(
      'monthly_plans',
      db && db.from('monthly_plans').select('*').gte('event_date', firstOfMonth(addDays(firstOfMonth(today), -1))).order('event_date').limit(500),
      sample.plans,
      errors,
    ),
    withFallback(
      'service_duties',
      db && db.from('service_duties').select('*').gte('week_date', addDays(today, -7)).order('week_date'),
      sample.duties,
      errors,
    ),
    withFallback('cleaning_schedules', db && db.from('cleaning_schedules').select('*').order('sort_order'), sample.cleaning, errors),
    withFallback('banners', db && db.from('banners').select('*').eq('is_active', true).order('sort_order').order('created_at', { ascending: false }), sample.banners, errors),
    withFallback(
      'national_seminars',
      db && db.from('national_seminars').select('*').gte('end_date', addDays(today, -30)).order('start_date').order('sort_order'),
      sample.seminars,
      errors,
    ),
    withFallback(
      'seminar_daily_duties',
      db && db.from('seminar_daily_duties').select('*').gte('day_date', addDays(today, -14)).order('day_date'),
      sample.seminarDuties,
      errors,
    ),
  ]);

  // Цээжлэх эшлэл: the admin's anchor in church_info drives a weekly rotation through the
  // verse book. Without one (or if the book can't load) the memory_verses table is used.
  const info = infoRows[0];
  let verseRows = verses;
  let verseRowsSrc = verseSrc;
  if (info.verse_anchor_id && info.verse_anchor_week) {
    const book = await verseBook;
    if (Array.isArray(book)) {
      const rotated = rotationVerses(book, info.verse_anchor_id, info.verse_anchor_week, addDays(weekSunday(today), -14), 6);
      if (rotated.length) {
        verseRows = rotated;
        verseRowsSrc = 'live';
      }
    } else {
      errors.push(`verse book: ${book instanceof Error ? book.message : String(book)}`);
    }
  }

  return {
    data: {
      churchInfo: info,
      announcements,
      verses: verseRows,
      plans,
      duties,
      cleaning: cleaning.map((c) => ({ ...c, tasks: c.tasks ?? [] })),
      banners,
      seminars,
      seminarDuties,
    },
    sources: {
      churchInfo: infoSrc,
      announcements: annSrc,
      verses: verseRowsSrc,
      plans: planSrc,
      duties: dutySrc,
      cleaning: cleaningSrc,
      banners: bannerSrc,
      seminars: seminarSrc,
      seminarDuties: seminarDutySrc,
    },
    errors,
  };
}
