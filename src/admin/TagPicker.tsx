import { useEffect, useState } from 'react';
import { Check, LoaderCircle, Plus, Settings2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

/* Shared tag list cache so every picker on screen stays in sync. */
let cache: string[] | null = null;
const subscribers = new Set<(tags: string[]) => void>();

async function loadTags(force = false): Promise<string[]> {
  if (cache && !force) return cache;
  const { data } = await supabase!.from('room_tags').select('name').order('sort_order').order('name');
  cache = (data ?? []).map((r: { name: string }) => r.name);
  subscribers.forEach((s) => s(cache!));
  return cache;
}

function useRoomTags(): string[] | null {
  const [tags, setTags] = useState<string[] | null>(cache);
  useEffect(() => {
    subscribers.add(setTags);
    void loadTags().then(setTags);
    return () => void subscribers.delete(setTags);
  }, []);
  return tags;
}

const split = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Text input + tap-to-toggle preset tags. Several tags join as "Их танхим, Коридор".
 * The preset list lives in the `room_tags` table and can be edited inline.
 */
export function TagPicker({
  id,
  value,
  onChange,
  required,
  placeholder,
  inputClass,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  inputClass: string;
}) {
  const tags = useRoomTags();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = split(value);

  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag];
    onChange(next.join(', '));
  };

  const addTag = async (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation(); // nested inside the record form
    const name = newTag.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase!.from('room_tags').insert({ name, sort_order: (tags?.length ?? 0) + 1 });
    setBusy(false);
    if (error && error.code !== '23505') return toast(error.message, 'error');
    setNewTag('');
    await loadTags(true);
    if (!selected.includes(name)) onChange([...selected, name].join(', '));
  };

  const removeTag = async (name: string) => {
    if (!window.confirm(`"${name}" tag-ийг жагсаалтаас устгах уу?`)) return;
    const { error } = await supabase!.from('room_tags').delete().eq('name', name);
    if (error) return toast(error.message, 'error');
    await loadTags(true);
  };

  return (
    <div className="space-y-2.5">
      <input
        id={id}
        required={required}
        placeholder={placeholder ?? 'Доороос сонгох эсвэл бичих'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />

      <div className="flex flex-wrap gap-2">
        {tags === null
          ? [0, 1, 2].map((i) => <span key={i} className="h-9 w-24 animate-pulse rounded-full bg-slate-200" />)
          : tags.map((tag) => {
              const on = selected.includes(tag);
              return editing ? (
                <span
                  key={tag}
                  className="inline-flex h-9 items-center gap-1 rounded-full bg-slate-100 pl-3.5 pr-1 text-sm font-medium text-slate-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`${tag} устгах`}
                    className="grid size-7 place-items-center rounded-full text-red-600 active:bg-red-50"
                  >
                    <X className="size-4" />
                  </button>
                </span>
              ) : (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  aria-pressed={on}
                  className={cn(
                    'inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-sm font-medium transition active:scale-95',
                    on ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700',
                  )}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                  {tag}
                </button>
              );
            })}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={cn(
            'inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold transition',
            editing ? 'bg-slate-800 text-white' : 'text-cyan-700',
          )}
        >
          {editing ? (
            'Болсон'
          ) : (
            <>
              <Settings2 className="size-4" /> Засах
            </>
          )}
        </button>
      </div>

      {editing && (
        // Not a <form>: forms can't nest inside the record form.
        <div className="flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag(e)}
            placeholder="Шинэ tag, ж: 3 давхар"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addTag}
            disabled={busy || !newTag.trim()}
            className="grid min-h-12 shrink-0 place-items-center rounded-xl bg-cyan-700 px-4 text-white disabled:opacity-40"
            aria-label="Tag нэмэх"
          >
            {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Plus className="size-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
