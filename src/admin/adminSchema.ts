import {
  BookMarked,
  CalendarDays,
  Handshake,
  Megaphone,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { TableName } from '../types/database';
import { DUTY_META, DUTY_ORDER, SEMINAR_DUTY_META, SEMINAR_DUTY_ORDER } from '../lib/duty';
import { dotDate, shortDate, upcomingSunday, weekdayShort } from '../lib/utils';

export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'checkbox' | 'select' | 'choice' | 'lines' | 'tags' | 'image';

export type FormValues = Record<string, string | boolean>;

export interface FieldConfig {
  key: string;
  /** Static, or depends on other answers (e.g. the plan category). */
  label: string | ((v: FormValues) => string);
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  default?: () => unknown;
  /** Hidden fields are saved as null. */
  showIf?: (v: FormValues) => boolean;
  /** Storage folder for `image` fields. */
  folder?: string;
}

type Row = Record<string, unknown>;

export interface TableConfig {
  table: TableName;
  label: string;
  /** Only one row (id = 1) — edited in place, no list. */
  singleton?: boolean;
  orderBy: { column: string; ascending: boolean };
  fields: FieldConfig[];
  title: (row: Row) => string;
  subtitle: (row: Row) => string;
}

const s = (v: unknown) => (v == null ? '' : String(v));
const cat = (v: FormValues) => String(v.category ?? '');

const PLAN_CATEGORY_LABEL: Record<string, string> = { seminar: 'Семинар', fellowship: 'Нөхөрлөл', service: 'Үйлчлэл' };

/* ------------------------------------------------------------------ tables */

const churchInfo: TableConfig = {
  table: 'church_info',
  label: 'Ерөнхий',
  singleton: true,
  orderBy: { column: 'id', ascending: true },
  title: (r) => s(r.church_name),
  subtitle: (r) => s(r.pastor),
  fields: [
    { key: 'church_name', label: 'Чуулганы нэр', type: 'text', required: true, default: () => 'УВС БАПТИСТ ЧУУЛГАН' },
    { key: 'pastor', label: 'Пастор', type: 'text', required: true, default: () => 'Ж.Билгүүн' },
    { key: 'phone', label: 'Утас', type: 'text', placeholder: '+976 ...' },
    { key: 'address', label: 'Хаяг', type: 'text' },
    { key: 'map_url', label: 'Google Maps холбоос', type: 'text', placeholder: 'https://maps.app.goo.gl/...' },
  ],
};

const announcements: TableConfig = {
  table: 'announcements',
  label: 'Зар',
  orderBy: { column: 'created_at', ascending: false },
  title: (r) => s(r.title),
  subtitle: (r) =>
    [
      { featured: 'Онцлох', seminar: 'Семинар', this_week: 'Энэ 7 хоногт' }[s(r.tag)] ?? 'Энгийн',
      r.event_date && shortDate(s(r.event_date)),
      !r.is_active && 'Нуусан',
    ]
      .filter(Boolean)
      .join(' · '),
  fields: [
    {
      key: 'tag',
      label: 'Төрөл',
      type: 'choice',
      default: () => '',
      hint: '«Онцлох» ба «Семинар» нүүрний баннерт гарна',
      options: [
        { value: '', label: 'Энгийн' },
        { value: 'featured', label: 'Онцлох' },
        { value: 'seminar', label: 'Семинар' },
        { value: 'this_week', label: 'Энэ 7 хоногт' },
      ],
    },
    { key: 'title', label: 'Гарчиг', type: 'text', required: true },
    { key: 'summary', label: 'Товч', type: 'textarea', required: true, hint: '1–2 өгүүлбэр' },
    { key: 'body', label: 'Дэлгэрэнгүй', type: 'textarea' },
    { key: 'event_date', label: 'Огноо', type: 'date' },
    { key: 'image_url', label: 'Зураг', type: 'image', folder: 'announcements' },
    { key: 'is_active', label: 'Апп дээр харуулах', type: 'checkbox', default: () => true },
  ],
};

const verses: TableConfig = {
  table: 'memory_verses',
  label: 'Эшлэл',
  orderBy: { column: 'week_start', ascending: false },
  title: (r) => s(r.reference),
  subtitle: (r) => shortDate(s(r.week_start)),
  fields: [
    { key: 'reference', label: 'Эшлэл', type: 'text', required: true, placeholder: 'Дуулал 4:7' },
    { key: 'text', label: 'Текст', type: 'textarea', required: true },
    { key: 'week_start', label: 'Долоо хоног (Ням)', type: 'date', required: true, default: () => upcomingSunday() },
  ],
};

/** One form, three shapes: the visible fields follow the chosen category. */
const plans: TableConfig = {
  table: 'monthly_plans',
  label: 'Төлөвлөгөө',
  orderBy: { column: 'event_date', ascending: false },
  title: (r) => s(r.title),
  subtitle: (r) =>
    [
      PLAN_CATEGORY_LABEL[s(r.category)] ?? 'Ангилалгүй',
      r.end_date ? `${dotDate(s(r.event_date))}–${dotDate(s(r.end_date))}` : shortDate(s(r.event_date)),
      s(r.time),
    ]
      .filter(Boolean)
      .join(' · '),
  fields: [
    {
      key: 'category',
      label: 'Ангилал',
      type: 'choice',
      required: true,
      default: () => 'service',
      options: [
        { value: 'seminar', label: 'Семинар' },
        { value: 'fellowship', label: 'Нөхөрлөл' },
        { value: 'service', label: 'Үйлчлэл' },
      ],
    },
    {
      key: 'group_name',
      label: 'Бүлэг',
      type: 'text',
      placeholder: 'Залуучууд, Ээжүүд, Хэсгийн…',
      showIf: (v) => cat(v) === 'fellowship',
    },
    {
      key: 'title',
      label: (v) => ({ seminar: 'Семинарын нэр', fellowship: 'Сэдэв' })[cat(v)] ?? 'Нэр',
      type: 'text',
      required: true,
    },
    { key: 'event_date', label: (v) => (cat(v) === 'seminar' ? 'Эхлэх огноо' : 'Огноо'), type: 'date', required: true },
    { key: 'end_date', label: 'Дуусах огноо', type: 'date', showIf: (v) => cat(v) === 'seminar' },
    { key: 'time', label: 'Цаг', type: 'text', placeholder: '10:00–17:00' },
    {
      key: 'speaker',
      label: (v) => ({ seminar: 'Пастор / Багш', fellowship: 'Удирдагч' })[cat(v)] ?? 'Хариуцагч',
      type: 'text',
    },
    { key: 'location', label: 'Байршил', type: 'tags' },
    {
      key: 'notes',
      label: (v) => (cat(v) === 'service' ? 'Тэмдэглэл' : 'Хөтөлбөр / дэлгэрэнгүй'),
      type: 'textarea',
    },
    {
      key: 'image_url',
      label: 'Зураг',
      type: 'image',
      folder: 'plans',
      showIf: (v) => cat(v) !== 'service',
    },
  ],
};

const nationalSeminars: TableConfig = {
  table: 'national_seminars',
  label: 'Бүх чуулганы семинар',
  orderBy: { column: 'start_date', ascending: false },
  title: (r) => s(r.churches),
  subtitle: (r) => `${dotDate(s(r.start_date))} – ${dotDate(s(r.end_date))}`,
  fields: [
    { key: 'start_date', label: 'Эхлэх огноо', type: 'date', required: true },
    { key: 'end_date', label: 'Дуусах огноо', type: 'date', required: true },
    { key: 'churches', label: 'Чуулганууд', type: 'textarea', required: true, placeholder: 'Баянхонгор, Булган, Увс', hint: 'Таслалаар тусгаарлана' },
    { key: 'notes', label: 'Тэмдэглэл', type: 'text' },
  ],
};

const sundayDuties: TableConfig = {
  table: 'service_duties',
  label: 'Ням гараг',
  orderBy: { column: 'week_date', ascending: false },
  title: (r) => DUTY_META[r.duty_type as keyof typeof DUTY_META]?.label ?? s(r.duty_type),
  subtitle: (r) => [shortDate(s(r.week_date)), r.district && `${s(r.district)}-р`, s(r.assignees)].filter(Boolean).join(' · '),
  fields: [
    {
      key: 'duty_type',
      label: 'Үйлчлэл',
      type: 'choice',
      required: true,
      default: () => 'kitchen',
      options: DUTY_ORDER.map((t) => ({ value: t, label: DUTY_META[t].label })),
    },
    { key: 'week_date', label: 'Ням гараг', type: 'date', required: true, default: () => upcomingSunday() },
    { key: 'district', label: 'Дүүрэг', type: 'text', placeholder: '12, 31', hint: 'Олон бол таслалаар' },
    { key: 'assignees', label: 'Хүмүүс', type: 'text', placeholder: 'Б.Сараа, Э.Номин' },
    { key: 'notes', label: 'Тэмдэглэл', type: 'text' },
  ],
};

const seminarDuties: TableConfig = {
  table: 'seminar_daily_duties',
  label: 'Семинар',
  orderBy: { column: 'day_date', ascending: true },
  title: (r) => SEMINAR_DUTY_META[r.duty_type as keyof typeof SEMINAR_DUTY_META]?.label ?? s(r.duty_type),
  subtitle: (r) => `${weekdayShort(s(r.day_date))} ${dotDate(s(r.day_date))} · ${s(r.assignees)}`,
  fields: [
    {
      key: 'duty_type',
      label: 'Үйлчлэл',
      type: 'choice',
      required: true,
      default: () => 'welcome',
      options: SEMINAR_DUTY_ORDER.map((t) => ({ value: t, label: SEMINAR_DUTY_META[t].label })),
    },
    { key: 'day_date', label: 'Өдөр', type: 'date', required: true },
    { key: 'assignees', label: 'Хариуцагч', type: 'text', required: true, placeholder: '31, 32  эсвэл  Хайр баг', hint: 'Дүүргийн дугаар эсвэл багийн нэр' },
    { key: 'notes', label: 'Тэмдэглэл', type: 'text' },
  ],
};

const fellowship: TableConfig = {
  table: 'fellowship_schedules',
  label: 'Долоо хоног бүр',
  orderBy: { column: 'sort_order', ascending: true },
  title: (r) => s(r.group_name),
  subtitle: (r) => `${s(r.day_of_week)} ${s(r.time)}`,
  fields: [
    { key: 'group_name', label: 'Бүлэг', type: 'text', required: true, placeholder: 'Залуучууд' },
    {
      key: 'day_of_week',
      label: 'Гараг',
      type: 'choice',
      required: true,
      default: () => 'Ням',
      options: ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'].map((d) => ({ value: d, label: d })),
    },
    { key: 'time', label: 'Цаг', type: 'text', required: true, placeholder: '18:30' },
    { key: 'location', label: 'Өрөө / байршил', type: 'tags' },
    { key: 'leader', label: 'Удирдагч', type: 'text' },
    { key: 'notes', label: 'Тэмдэглэл', type: 'text' },
  ],
};

export const ADMIN_TABLES: TableConfig[] = [
  churchInfo,
  announcements,
  verses,
  plans,
  nationalSeminars,
  sundayDuties,
  seminarDuties,
  fellowship,
];

/* ------------------------------------------------------------------ groups */

/** A sub-section is a table, or one of the custom panels. */
export type AdminSection = { id: string; label: string } & ({ table: TableConfig } | { panel: 'files' | 'admins' });

export interface AdminGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: AdminSection[];
}

/** Six top-level tabs instead of ten; related tables become sub-tabs. */
export const ADMIN_GROUPS: AdminGroup[] = [
  { id: 'news', label: 'Зар', icon: Megaphone, sections: [{ id: 'announcements', label: 'Зар', table: announcements }] },
  { id: 'verse', label: 'Эшлэл', icon: BookMarked, sections: [{ id: 'verses', label: 'Эшлэл', table: verses }] },
  {
    id: 'plan',
    label: 'Төлөвлөгөө',
    icon: CalendarDays,
    sections: [
      { id: 'plans', label: 'Төлөвлөгөө', table: plans },
      { id: 'files', label: 'Сарын файл', panel: 'files' },
      { id: 'national', label: 'Бүх чуулган', table: nationalSeminars },
    ],
  },
  {
    id: 'duty',
    label: 'Үйлчлэл',
    icon: Handshake,
    sections: [
      { id: 'sunday', label: 'Ням гараг', table: sundayDuties },
      { id: 'seminar', label: 'Семинар', table: seminarDuties },
    ],
  },
  { id: 'fellowship', label: 'Нөхөрлөл', icon: Users, sections: [{ id: 'fellowship', label: 'Нөхөрлөл', table: fellowship }] },
  {
    id: 'settings',
    label: 'Тохиргоо',
    icon: Settings,
    sections: [
      { id: 'church', label: 'Ерөнхий', table: churchInfo },
      { id: 'admins', label: 'Админууд', panel: 'admins' },
    ],
  },
];
