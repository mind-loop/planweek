import { BookMarked, CalendarDays, Church, Handshake, Megaphone, SprayCan, Users, type LucideIcon } from 'lucide-react';
import type { TableName } from '../types/database';
import { DUTY_META, DUTY_ORDER } from '../lib/duty';
import { shortDate, upcomingSunday } from '../lib/utils';

export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'checkbox' | 'select' | 'lines' | 'tags';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  default?: () => unknown;
}

type Row = Record<string, unknown>;

export interface TableConfig {
  table: TableName;
  label: string;
  icon: LucideIcon;
  /** Only one row (id = 1) — edited in place, no list. */
  singleton?: boolean;
  orderBy: { column: string; ascending: boolean };
  fields: FieldConfig[];
  title: (row: Row) => string;
  subtitle: (row: Row) => string;
}

const s = (v: unknown) => (v == null ? '' : String(v));

export const ADMIN_TABLES: TableConfig[] = [
  {
    table: 'church_info',
    label: 'Ерөнхий',
    icon: Church,
    singleton: true,
    orderBy: { column: 'id', ascending: true },
    title: (r) => s(r.church_name),
    subtitle: (r) => `№${s(r.issue_no)}`,
    fields: [
      { key: 'church_name', label: 'Чуулганы нэр', type: 'text', required: true, default: () => 'УВС БАПТИСТ ЧУУЛГАН' },
      { key: 'pastor', label: 'Пастор', type: 'text', required: true, default: () => 'Ж.Билгүүн' },
      { key: 'issue_no', label: 'Дугаар №', type: 'number', required: true, default: () => 1 },
      { key: 'issue_date', label: 'Гарсан огноо', type: 'date', required: true, default: () => upcomingSunday() },
      { key: 'phone', label: 'Утас', type: 'text', placeholder: '+976 ...' },
      { key: 'address', label: 'Хаяг', type: 'text' },
      { key: 'map_url', label: 'Google Maps холбоос', type: 'text', placeholder: 'https://maps.app.goo.gl/...' },
    ],
  },
  {
    table: 'announcements',
    label: 'Зар',
    icon: Megaphone,
    orderBy: { column: 'sort_order', ascending: true },
    title: (r) => s(r.title),
    subtitle: (r) => `${r.is_active ? 'Идэвхтэй' : 'Нуусан'}${r.event_date ? ' · ' + shortDate(s(r.event_date)) : ''}`,
    fields: [
      { key: 'title', label: 'Гарчиг', type: 'text', required: true },
      { key: 'summary', label: 'Товч (картанд)', type: 'textarea', required: true },
      { key: 'body', label: 'Дэлгэрэнгүй текст', type: 'textarea' },
      {
        key: 'tag',
        label: 'Шошго',
        type: 'select',
        options: [
          { value: '', label: '— Байхгүй —' },
          { value: 'featured', label: 'Онцлох зар' },
          { value: 'this_week', label: 'Энэ 7 хоногт' },
        ],
      },
      { key: 'event_date', label: 'Үйл явдлын огноо', type: 'date' },
      { key: 'image_url', label: 'Зургийн холбоос (URL)', type: 'text', placeholder: 'https://...' },
      { key: 'sort_order', label: 'Дараалал', type: 'number', default: () => 10, hint: 'Бага тоо түрүүнд харагдана' },
      { key: 'is_active', label: 'Харуулах', type: 'checkbox', default: () => true },
    ],
  },
  {
    table: 'memory_verses',
    label: 'Эшлэл',
    icon: BookMarked,
    orderBy: { column: 'week_start', ascending: false },
    title: (r) => s(r.reference),
    subtitle: (r) => shortDate(s(r.week_start)),
    fields: [
      { key: 'reference', label: 'Эшлэл', type: 'text', required: true, placeholder: 'Дуулал 4:7' },
      { key: 'text', label: 'Текст', type: 'textarea', required: true },
      { key: 'week_start', label: 'Долоо хоног (Ням)', type: 'date', required: true, default: () => upcomingSunday() },
    ],
  },
  {
    table: 'monthly_plans',
    label: 'Төлөвлөгөө',
    icon: CalendarDays,
    orderBy: { column: 'event_date', ascending: false },
    title: (r) => s(r.title),
    subtitle: (r) => `${shortDate(s(r.event_date))}${r.time ? ' · ' + s(r.time) : ''}`,
    fields: [
      { key: 'event_date', label: 'Огноо', type: 'date', required: true },
      { key: 'title', label: 'Нэр', type: 'text', required: true, placeholder: 'Бэлтгэл анги' },
      { key: 'time', label: 'Цаг', type: 'text', placeholder: '18:00' },
      { key: 'speaker', label: 'Илтгэгч', type: 'text' },
      { key: 'location', label: 'Байршил', type: 'tags' },
      { key: 'notes', label: 'Тэмдэглэл', type: 'textarea' },
    ],
  },
  {
    table: 'service_duties',
    label: 'Үйлчлэл',
    icon: Handshake,
    orderBy: { column: 'week_date', ascending: false },
    title: (r) => DUTY_META[r.duty_type as keyof typeof DUTY_META]?.label ?? s(r.duty_type),
    subtitle: (r) => [shortDate(s(r.week_date)), r.district && `${s(r.district)}-р`, s(r.assignees)].filter(Boolean).join(' · '),
    fields: [
      { key: 'week_date', label: 'Ням гараг', type: 'date', required: true, default: () => upcomingSunday() },
      {
        key: 'duty_type',
        label: 'Үйлчлэл',
        type: 'select',
        required: true,
        default: () => 'kitchen',
        options: DUTY_ORDER.map((t) => ({ value: t, label: DUTY_META[t].label })),
      },
      { key: 'district', label: 'Дүүрэг', type: 'text', placeholder: '12, 31', hint: 'Олон бол таслалаар' },
      { key: 'assignees', label: 'Хүмүүс', type: 'text', placeholder: 'Б.Сараа, Э.Номин' },
      { key: 'notes', label: 'Тэмдэглэл', type: 'text' },
    ],
  },
  {
    table: 'fellowship_schedules',
    label: 'Нөхөрлөл',
    icon: Users,
    orderBy: { column: 'sort_order', ascending: true },
    title: (r) => s(r.group_name),
    subtitle: (r) => `${s(r.day_of_week)} ${s(r.time)}`,
    fields: [
      { key: 'group_name', label: 'Бүлэг', type: 'text', required: true, placeholder: 'Залуучууд' },
      {
        key: 'day_of_week',
        label: 'Гараг',
        type: 'select',
        required: true,
        default: () => 'Ням',
        options: ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'].map((d) => ({ value: d, label: d })),
      },
      { key: 'time', label: 'Цаг', type: 'text', required: true, placeholder: '18:30' },
      { key: 'location', label: 'Өрөө / байршил', type: 'tags' },
      { key: 'leader', label: 'Удирдагч', type: 'text' },
      { key: 'notes', label: 'Тэмдэглэл', type: 'text' },
      { key: 'sort_order', label: 'Дараалал', type: 'number', default: () => 10 },
    ],
  },
  {
    table: 'cleaning_schedules',
    label: 'Цэвэрлэгээ',
    icon: SprayCan,
    orderBy: { column: 'sort_order', ascending: true },
    title: (r) => s(r.area),
    subtitle: (r) => `${s(r.district)}-р дүүрэг`,
    fields: [
      { key: 'district', label: 'Дүүрэг', type: 'text', required: true, placeholder: '12, 31' },
      { key: 'area', label: 'Хэсэг / өрөө', type: 'tags', required: true, hint: 'Хэд хэдийг сонгож болно' },
      { key: 'tasks', label: 'Хийх ажлууд', type: 'lines', hint: 'Мөр бүрт нэг ажил' },
      { key: 'notes', label: 'Тэмдэглэл', type: 'textarea' },
      { key: 'sort_order', label: 'Дараалал', type: 'number', default: () => 10 },
    ],
  },
];
