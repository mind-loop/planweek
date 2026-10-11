import {
  BookMarked,
  CalendarDays,
  Handshake,
  Megaphone,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { TableName } from '../types/database';
import { dotDate, shortDate, upcomingSunday } from '../lib/utils';

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

const PLAN_CATEGORY_LABEL: Record<string, string> = {
  seminar: 'Семинар',
  fellowship: 'Нөхөрлөл',
  word: 'Үг',
  school: 'Чуулганы сургууль',
  service: 'Үйлчлэл',
};

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
      hint: '«Онцлох», «Семинар» зарлалын жагсаалтын эхэнд гарна',
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

const banners: TableConfig = {
  table: 'banners',
  label: 'Баннер',
  orderBy: { column: 'sort_order', ascending: true },
  title: (r) => s(r.title) || 'Баннер',
  subtitle: (r) =>
    [
      !r.is_active && 'Нуусан',
      r.start_date || r.end_date ? `${r.start_date ? dotDate(s(r.start_date)) : '…'} – ${r.end_date ? dotDate(s(r.end_date)) : '…'}` : 'Үргэлж',
      r.link_url && 'Холбоостой',
    ]
      .filter(Boolean)
      .join(' · '),
  fields: [
    { key: 'image_url', label: 'Баннер зураг', type: 'image', folder: 'banners', required: true, hint: '16:9 хэмжээтэй (ж: 1600×900) зураг хамгийн сайн харагдана' },
    { key: 'title', label: 'Тайлбар', type: 'text', placeholder: 'Заавал биш' },
    { key: 'link_url', label: 'Дарахад нээх холбоос', type: 'text', placeholder: 'https://… (заавал биш)', hint: 'Хоосон бол зураг томоор нээгдэнэ' },
    { key: 'start_date', label: 'Харуулж эхлэх', type: 'date' },
    { key: 'end_date', label: 'Харуулж дуусах', type: 'date' },
    { key: 'sort_order', label: 'Дараалал', type: 'number', default: () => 10, hint: 'Бага тоо түрүүнд' },
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
        { value: 'word', label: 'Үг' },
        { value: 'school', label: 'Чуулганы сургууль' },
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
      label: (v) => ({ seminar: 'Семинарын нэр', fellowship: 'Сэдэв', school: 'Анги' })[cat(v)] ?? 'Нэр',
      type: 'text',
      required: true,
    },
    { key: 'event_date', label: (v) => (cat(v) === 'seminar' ? 'Эхлэх огноо' : 'Огноо'), type: 'date', required: true },
    { key: 'end_date', label: 'Дуусах огноо', type: 'date', showIf: (v) => cat(v) === 'seminar' },
    { key: 'time', label: 'Цаг', type: 'text', placeholder: '10:00–17:00' },
    {
      key: 'speaker',
      label: (v) => ({ seminar: 'Пастор / Багш', fellowship: 'Удирдагч', word: 'Номлогч', school: 'Багш' })[cat(v)] ?? 'Хариуцагч',
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




export const ADMIN_TABLES: TableConfig[] = [
  churchInfo,
  announcements,
  banners,
  verses,
  plans,
  nationalSeminars,
];

/* ------------------------------------------------------------------ groups */

/** A sub-section is a table, or one of the custom panels. */
export type AdminSection = { id: string; label: string } & ({ table: TableConfig } | { panel: 'files' | 'admins' | 'dutyGrid' | 'seminarGrid' | 'cleaning' | 'planCalendar' });

export interface AdminGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: AdminSection[];
}

/** Five top-level tabs; related tables become sub-tabs. */
export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: 'news',
    label: 'Зар',
    icon: Megaphone,
    sections: [
      { id: 'announcements', label: 'Зар', table: announcements },
      { id: 'banners', label: 'Баннер', table: banners },
    ],
  },
  { id: 'verse', label: 'Эшлэл', icon: BookMarked, sections: [{ id: 'verses', label: 'Эшлэл', table: verses }] },
  {
    id: 'plan',
    label: 'Төлөвлөгөө',
    icon: CalendarDays,
    sections: [
      { id: 'plans', label: 'Календарь', panel: 'planCalendar' },
      { id: 'files', label: 'Сарын файл', panel: 'files' },
      { id: 'national', label: 'Бүх чуулган', table: nationalSeminars },
    ],
  },
  {
    id: 'duty',
    label: 'Үйлчлэл',
    icon: Handshake,
    sections: [
      { id: 'sunday', label: 'Ням гараг', panel: 'dutyGrid' },
      { id: 'seminar', label: 'Семинар (5 хоног)', panel: 'seminarGrid' },
      { id: 'cleaning', label: 'Цэвэрлэгээ', panel: 'cleaning' },
    ],
  },
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
