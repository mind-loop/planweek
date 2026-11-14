import type { MemoryVerse } from '../types/database';
import { addDays, daysBetween, parseISODate, todayISO } from './utils';

/**
 * Цээжлэх эшлэл book (public/must_memo_verses_AB2019.json, 241 verses).
 * The admin picks which verse belongs to one week; every week after it takes
 * the next verse, every week before it the previous one, wrapping around.
 */
export const VERSE_BOOK_URL = '/must_memo_verses_AB2019.json';

export interface BookVerse {
  id: number;
  category: string;
  /** e.g. "Дуулал 119:9–11" */
  ref: string;
  text: string;
}

interface RawVerse {
  id: number;
  category: string;
  ref: { mn: string };
  text: { mn: string };
}

let cache: Promise<BookVerse[]> | null = null;

/** Loads the verse book once per page (precached by the service worker, so it works offline). */
export function loadVerseBook(): Promise<BookVerse[]> {
  cache ??= fetch(VERSE_BOOK_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Эшлэлийн файл ачаалагдсангүй (${r.status})`);
      return r.json() as Promise<{ verses: RawVerse[] }>;
    })
    .then((d) => d.verses.map((v) => ({ id: v.id, category: v.category, ref: v.ref.mn, text: v.text.mn })))
    .catch((e) => {
      cache = null; // let the next call retry
      throw e;
    });
  return cache;
}

/** Sunday that starts the week containing `iso` (weeks run Sunday → Saturday). */
export function weekSunday(iso = todayISO()): string {
  return addDays(iso, -parseISODate(iso).getDay());
}

/** Verse for the week starting on `week`, given the admin's anchor. */
export function verseForWeek(book: BookVerse[], anchorId: number, anchorWeek: string, week: string): BookVerse | undefined {
  const start = book.findIndex((v) => v.id === anchorId);
  if (start < 0 || book.length === 0) return undefined;
  const n = Math.round(daysBetween(weekSunday(anchorWeek), weekSunday(week)) / 7);
  return book[(((start + n) % book.length) + book.length) % book.length];
}

/**
 * `count` consecutive weeks of verses starting at the week of `from`, shaped like
 * memory_verses rows so the home page and printed bulletin use them unchanged.
 */
export function rotationVerses(book: BookVerse[], anchorId: number, anchorWeek: string, from: string, count: number): MemoryVerse[] {
  const out: MemoryVerse[] = [];
  for (let i = 0; i < count; i++) {
    const week = addDays(weekSunday(from), i * 7);
    const v = verseForWeek(book, anchorId, anchorWeek, week);
    if (v) out.push({ id: `book-${v.id}-${week}`, reference: v.ref, text: v.text, week_start: week });
  }
  return out;
}
