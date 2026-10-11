import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft,
  LoaderCircle,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { Card, Sheet, Skeleton } from '../components/ui';
import { ADMIN_GROUPS, type FieldConfig, type FormValues, type TableConfig } from './adminSchema';
import { ImageField } from './ImageField';
import { removeByUrl } from '../lib/storage';
import { AdminUsersPanel, type AdminRole } from './AdminUsersPanel';
import { TagPicker } from './TagPicker';
import { PlanFilesPanel } from './PlanFilesPanel';
import { DutyGridPanel, SeminarGridPanel } from './DutyGridPanel';
import { CleaningAreasPanel } from './CleaningAreasPanel';
import { RecurringFillButton } from './RecurringFill';

type Row = Record<string, unknown> & { id?: string | number };

const inputClass =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15';

function exitAdmin() {
  window.location.hash = '#/home';
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="pt-safe sticky top-0 z-40 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2">
          <button type="button" onClick={exitAdmin} aria-label="Буцах" className="grid size-11 place-items-center rounded-full active:bg-white/10">
            <ArrowLeft className="size-6" />
          </button>
          <ShieldCheck className="size-5 text-cyan-400" />
          <h1 className="flex-1 text-lg font-bold">Админ</h1>
          {session && (
            <button
              type="button"
              onClick={() => supabase?.auth.signOut()}
              className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold active:bg-white/10"
            >
              <LogOut className="size-4" /> Гарах
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {!supabase ? (
          <Card className="p-5 text-[15px] leading-relaxed text-slate-700">
            <p className="font-bold text-slate-900">Supabase тохируулаагүй байна.</p>
            <p className="mt-2">
              <code>.env.local</code> файлд <code>VITE_SUPABASE_URL</code> болон <code>VITE_SUPABASE_ANON_KEY</code>-г оруулаад дахин
              ачаална уу.
            </p>
          </Card>
        ) : checking ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : session ? (
          <AdminDashboard email={session.user.email ?? ''} />
        ) : (
          <LoginForm />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ Login */

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? 'Имэйл эсвэл нууц үг буруу байна' : error.message);
  };

  return (
    <Card className="mx-auto max-w-sm p-6">
      <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
        <Lock className="size-7" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Админ нэвтрэх</h2>
      <p className="mt-1 text-[15px] text-slate-500">Зөвхөн мэдээ шинэчлэх эрхтэй хүмүүст.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          type="email"
          required
          autoComplete="username"
          placeholder="Имэйл"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Нууц үг"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[15px] font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy && <LoaderCircle className="size-5 animate-spin" />} Нэвтрэх
        </button>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------- Dashboard */

function AdminDashboard({ email }: { email: string }) {
  const [role, setRole] = useState<AdminRole | null | undefined>(undefined);
  const [groupId, setGroupId] = useState(ADMIN_GROUPS[0].id);
  const [sectionByGroup, setSectionByGroup] = useState<Record<string, string>>({});

  const loadRole = useCallback(async () => {
    const { data, error } = await supabase!.rpc('my_admin_role');
    setRole(error ? null : ((data as AdminRole | null) ?? null));
  }, []);

  useEffect(() => {
    void loadRole();
  }, [loadRole]);

  if (role === undefined) return <Skeleton className="h-48 rounded-2xl" />;

  if (role === null) {
    return (
      <Card className="p-5 text-[15px] leading-relaxed text-slate-700">
        <p className="font-bold text-slate-900">Танд засварлах эрх олгогдоогүй байна.</p>
        <p className="mt-2">
          <b>{email}</b> хаягийг superadmin-д хэлж админаар нэмүүлнэ үү.
        </p>
      </Card>
    );
  }

  const group = ADMIN_GROUPS.find((g) => g.id === groupId) ?? ADMIN_GROUPS[0];
  const section = group.sections.find((s) => s.id === sectionByGroup[group.id]) ?? group.sections[0];

  return (
    <div>
      <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {email}
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-bold',
            role === 'superadmin' ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 text-slate-700',
          )}
        >
          {role === 'superadmin' ? 'Superadmin' : 'Admin'}
        </span>
      </p>

      {/* Main sections: 3 × 2 grid, every label visible at once */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {ADMIN_GROUPS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setGroupId(id)}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold transition active:scale-95',
              id === group.id ? 'bg-cyan-700 text-white shadow-md shadow-cyan-900/20' : 'bg-white text-slate-700 shadow-soft',
            )}
          >
            <Icon className="size-5" /> {label}
          </button>
        ))}
      </div>

      {group.sections.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {group.sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSectionByGroup((m) => ({ ...m, [group.id]: s.id }))}
              className={cn(
                'min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition',
                s.id === section.id ? 'bg-slate-900 text-white' : 'bg-slate-200/70 text-slate-700',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {'panel' in section ? (
        section.panel === 'cleaning' ? (
          <CleaningAreasPanel />
        ) : section.panel === 'seminarGrid' ? (
          <SeminarGridPanel />
        ) : section.panel === 'dutyGrid' ? (
          <DutyGridPanel />
        ) : section.panel === 'files' ? (
          <PlanFilesPanel />
        ) : (
          <AdminUsersPanel myEmail={email} myRole={role} onRoleChanged={loadRole} />
        )
      ) : section.table.singleton ? (
        <SingletonEditor key={section.id} config={section.table} />
      ) : (
        <CrudPanel key={section.id} config={section.table} />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Helpers */

const labelOf = (f: FieldConfig, v: FormValues) => (typeof f.label === 'function' ? f.label(v) : f.label);
const isVisible = (f: FieldConfig, v: FormValues) => !f.showIf || f.showIf(v);

function toFormValues(fields: FieldConfig[], row: Row | null): FormValues {
  const values: FormValues = {};
  for (const f of fields) {
    const raw = row ? row[f.key] : f.default?.();
    if (f.type === 'checkbox') values[f.key] = Boolean(raw);
    else if (f.type === 'lines') values[f.key] = Array.isArray(raw) ? raw.join('\n') : '';
    else values[f.key] = raw == null ? '' : String(raw);
  }
  return values;
}

function toPayload(fields: FieldConfig[], values: FormValues): Row {
  const out: Row = {};
  for (const f of fields) {
    const v = values[f.key];
    if (!isVisible(f, values)) out[f.key] = f.type === 'checkbox' ? false : null;
    else if (f.type === 'checkbox') out[f.key] = Boolean(v);
    else if (f.type === 'number') out[f.key] = v === '' ? null : Number(v);
    else if (f.type === 'lines')
      out[f.key] = String(v)
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean);
    else {
      const t = String(v).trim();
      out[f.key] = t === '' ? null : t;
    }
  }
  return out;
}

/** Postgres errors → plain Mongolian where we know the cause. */
function friendlyError(message: string): string {
  if (message.includes('end_after_start')) return 'Дуусах огноо эхлэх огнооноос өмнө байна';
  if (message.includes('row-level security')) return 'Танд энэ үйлдлийг хийх эрх алга';
  return message;
}

/** Image URLs a save replaced or cleared — safe to delete from storage afterwards. */
function droppedImages(fields: FieldConfig[], before: Row | null, after: Row): string[] {
  if (!before) return [];
  return fields
    .filter((f) => f.type === 'image' && typeof before[f.key] === 'string' && before[f.key] && before[f.key] !== after[f.key])
    .map((f) => before[f.key] as string);
}

function RecordForm({
  fields,
  values,
  onChange,
}: {
  fields: FieldConfig[];
  values: FormValues;
  onChange: (key: string, value: string | boolean) => void;
}) {
  return (
    <div className="space-y-5">
      {fields
        .filter((f) => isVisible(f, values))
        .map((f) => {
          const id = `f-${f.key}`;
          const label = labelOf(f, values);
          if (f.type === 'checkbox') {
            return (
              <label key={f.key} htmlFor={id} className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-3.5">
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(values[f.key])}
                  onChange={(e) => onChange(f.key, e.target.checked)}
                  className="size-5 accent-cyan-700"
                />
                <span className="font-medium text-slate-800">{label}</span>
              </label>
            );
          }
          const common = {
            id,
            required: f.required,
            placeholder: f.placeholder,
            value: String(values[f.key] ?? ''),
            onChange: (e: { target: { value: string } }) => onChange(f.key, e.target.value),
          };
          return (
            <div key={f.key} className="animate-fade-in">
              <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold text-slate-700">
                {label}
                {f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === 'choice' ? (
                <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
                  {f.options?.map((o) => {
                    const on = String(values[f.key] ?? '') === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(f.key, o.value)}
                        className={cn(
                          'min-h-11 rounded-full px-4 text-[15px] font-semibold transition active:scale-95',
                          on ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              ) : f.type === 'image' ? (
                <ImageField id={id} folder={f.folder ?? 'misc'} value={String(values[f.key] ?? '')} onChange={(v) => onChange(f.key, v)} />
              ) : f.type === 'tags' ? (
                <TagPicker
                  id={id}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={String(values[f.key] ?? '')}
                  onChange={(v) => onChange(f.key, v)}
                  inputClass={inputClass}
                />
              ) : f.type === 'textarea' || f.type === 'lines' ? (
                <textarea {...common} rows={f.type === 'lines' ? 5 : 4} className={cn(inputClass, 'py-3')} />
              ) : f.type === 'select' ? (
                <select {...common} className={inputClass}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input {...common} type={f.type === 'number' ? 'number' : f.type} inputMode={f.type === 'number' ? 'numeric' : undefined} className={inputClass} />
              )}
              {f.hint && <p className="mt-1 text-sm text-slate-500">{f.hint}</p>}
            </div>
          );
        })}
    </div>
  );
}

function SaveButton({ busy, form }: { busy: boolean; form: string }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={busy}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
    >
      {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />} Хадгалах
    </button>
  );
}

/* ------------------------------------------------------- Singleton editor */

function SingletonEditor({ config }: { config: TableConfig }) {
  const toast = useToast();
  const { reload } = useBulletin();
  const [values, setValues] = useState<FormValues | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase!
      .from(config.table)
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast(error.message, 'error');
        setValues(toFormValues(config.fields, (data as Row | null) ?? null));
      });
  }, [config, toast]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values) return;
    setBusy(true);
    const { error } = await supabase!.from(config.table).upsert({ id: 1, ...toPayload(config.fields, values) });
    setBusy(false);
    if (error) return toast(friendlyError(error.message), 'error');
    toast('Хадгалагдлаа');
    void reload();
  };

  if (!values) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <Card className="p-5">
      <form id="singleton-form" onSubmit={submit}>
        <RecordForm fields={config.fields} values={values} onChange={(k, v) => setValues((s) => ({ ...s!, [k]: v }))} />
      </form>
      <div className="mt-5">
        <SaveButton busy={busy} form="singleton-form" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ List + CRUD */

function CrudPanel({ config }: { config: TableConfig }) {
  const toast = useToast();
  const { reload } = useBulletin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase!
      .from(config.table)
      .select('*')
      .order(config.orderBy.column, { ascending: config.orderBy.ascending })
      .limit(300);
    if (error) toast(error.message, 'error');
    setRows((data as Row[]) ?? []);
  }, [config, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const afterChange = async (msg: string) => {
    toast(msg);
    await load();
    void reload();
  };

  const openEditor = (row: Row | 'new') => {
    setValues(toFormValues(config.fields, row === 'new' ? null : row));
    setEditing(row);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const payload = toPayload(config.fields, values);
    const { error } =
      editing === 'new'
        ? await supabase!.from(config.table).insert(payload)
        : await supabase!.from(config.table).update(payload).eq('id', editing.id);
    setBusy(false);
    if (error) return toast(friendlyError(error.message), 'error');
    // Only now is it safe to drop images the edit replaced or cleared.
    droppedImages(config.fields, editing === 'new' ? null : editing, payload).forEach((url) => void removeByUrl(url));
    setEditing(null);
    await afterChange(editing === 'new' ? 'Нэмэгдлээ' : 'Шинэчлэгдлээ');
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`"${config.title(row)}"-г устгах уу?`)) return;
    const { error } = await supabase!.from(config.table).delete().eq('id', row.id);
    if (error) return toast(friendlyError(error.message), 'error');
    droppedImages(config.fields, row, {}).forEach((url) => void removeByUrl(url));
    await afterChange('Устгагдлаа');
  };

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => openEditor('new')}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white shadow-sm active:scale-[0.98]"
        >
          <Plus className="size-5" /> Шинэ нэмэх
        </button>
        {config.table === 'monthly_plans' && (
          <RecurringFillButton
            onDone={() => {
              void load();
              void reload();
            }}
          />
        )}
        <button
          type="button"
          onClick={() => void load()}
          aria-label="Дахин ачаалах"
          className="grid size-12 place-items-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 active:scale-95"
        >
          <RefreshCw className="size-5" />
        </button>
      </div>

      {rows === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-[15px] text-slate-500">
          Мэдээлэл алга. Хоосон үед апп жишээ өгөгдөл харуулна.
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={String(row.id)} className="flex items-center gap-2 py-2 pl-4 pr-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{config.title(row) || '—'}</p>
                <p className="truncate text-sm text-slate-500">{config.subtitle(row)}</p>
              </div>
              <button
                type="button"
                onClick={() => openEditor(row)}
                aria-label="Засах"
                className="grid size-11 place-items-center rounded-full text-cyan-700 active:bg-cyan-50"
              >
                <Pencil className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => remove(row)}
                aria-label="Устгах"
                className="grid size-11 place-items-center rounded-full text-red-600 active:bg-red-50"
              >
                <Trash2 className="size-5" />
              </button>
            </div>
          ))}
        </Card>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? `${config.label}: шинэ` : `${config.label}: засах`}
        footer={<SaveButton busy={busy} form="crud-form" />}
      >
        <form id="crud-form" onSubmit={submit} className="pt-1">
          <RecordForm fields={config.fields} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
        </form>
      </Sheet>
    </div>
  );
}
