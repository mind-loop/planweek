/**
 * Row types for every Supabase table. Keep in sync with supabase/schema.sql.
 * Dates are ISO strings (`YYYY-MM-DD`) exactly as PostgREST returns them.
 */

/** Single-row table holding issue metadata and contact details. */
export interface ChurchInfo {
  id: number;
  church_name: string;
  pastor: string;
  issue_no: number;
  issue_date: string;
  phone: string | null;
  address: string | null;
  map_url: string | null;
  updated_at?: string;
}

export type AnnouncementTag = 'featured' | 'this_week' | 'seminar' | null;

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  tag: AnnouncementTag;
  image_url: string | null;
  event_date: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface MemoryVerse {
  id: string;
  /** e.g. "Дуулал 4:7" */
  reference: string;
  text: string;
  /** Sunday the verse is assigned to. */
  week_start: string;
  created_at?: string;
}

export type PlanCategory = 'seminar' | 'fellowship' | 'service';

export interface MonthlyPlan {
  id: string;
  event_date: string;
  title: string;
  /** Free text, e.g. "18:00" or "10:00–13:00" */
  time: string | null;
  speaker: string | null;
  location: string | null;
  notes: string | null;
  /** Семинар / Нөхөрлөл / Үйлчлэл */
  category: PlanCategory | null;
  /** Семинар: last day (multi-day events). */
  end_date: string | null;
  /** Нөхөрлөл: which group, e.g. "Залуучууд". */
  group_name: string | null;
  image_url: string | null;
  created_at?: string;
}

export type DutyType = 'kitchen' | 'childcare' | 'welcome' | 'scripture';

export interface ServiceDuty {
  id: string;
  /** The Sunday this duty applies to. */
  week_date: string;
  duty_type: DutyType;
  /** Comma-separated district numbers, e.g. "12, 31". Empty for person-only duties. */
  district: string | null;
  /** Names of people serving (free text). */
  assignees: string | null;
  notes: string | null;
  created_at?: string;
}

export interface FellowshipSchedule {
  id: string;
  /** e.g. "Эзний өдөр", "Залуучууд" */
  group_name: string;
  /** e.g. "Ням", "Лхагва" */
  day_of_week: string;
  time: string;
  location: string | null;
  leader: string | null;
  notes: string | null;
  sort_order: number;
  created_at?: string;
}


/** Nationwide Bible seminar: which churches attend in which date range. */
export interface NationalSeminar {
  id: string;
  start_date: string;
  end_date: string;
  /** Comma-separated church/region names, e.g. "Баянхонгор, Булган, Увс" */
  churches: string;
  notes: string | null;
  sort_order: number;
  created_at?: string;
}

export type SeminarDutyType = 'welcome' | 'tea' | 'childcare' | 'cleaning';

/** One duty on one seminar day, e.g. 10/13 · Угталт · "31, 32". */
export interface SeminarDailyDuty {
  id: string;
  day_date: string;
  duty_type: SeminarDutyType;
  /** District numbers ("31, 32") or team names ("Хайр баг"). */
  assignees: string;
  notes: string | null;
  created_at?: string;
}

/** Map of table name → row type; drives the generic fetch and admin CRUD helpers. */
export interface Tables {
  church_info: ChurchInfo;
  announcements: Announcement;
  memory_verses: MemoryVerse;
  monthly_plans: MonthlyPlan;
  service_duties: ServiceDuty;
  fellowship_schedules: FellowshipSchedule;
  plan_files: PlanFile;
  national_seminars: NationalSeminar;
  seminar_daily_duties: SeminarDailyDuty;
}

export type TableName = keyof Tables;

export interface BulletinData {
  churchInfo: ChurchInfo;
  announcements: Announcement[];
  verses: MemoryVerse[];
  plans: MonthlyPlan[];
  duties: ServiceDuty[];
  fellowship: FellowshipSchedule[];
  planFiles: PlanFile[];
  seminars: NationalSeminar[];
  seminarDuties: SeminarDailyDuty[];
}

/** Downloadable monthly schedule (PDF/PNG) stored in the `plan-files` bucket. */
export interface PlanFile {
  id: string;
  /** First day of the month it covers. */
  month: string;
  title: string | null;
  file_path: string;
  file_url: string;
  mime_type: string | null;
  created_at?: string;
}
