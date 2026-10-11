import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { IMAGE_TYPES, MAX_UPLOAD_MB, uploadToBucket, validateUpload } from '../lib/storage';

/** Pick → upload to Supabase Storage → store the public URL in the form. */
export function ImageField({ id, value, onChange, folder }: { id: string; value: string; onChange: (url: string) => void; folder: string }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateUpload(file, IMAGE_TYPES);
    if (problem) return toast(problem, 'error');
    setBusy(true);
    try {
      const { url } = await uploadToBucket(file, folder);
      onChange(url); // the old file is removed only after the record is saved
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Зураг оруулж чадсангүй', 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };


  return (
    <div>
      <input
        id={id}
        ref={input}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {value ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <img src={value} alt="" className="max-h-56 w-full bg-slate-50 object-contain" />
          <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="flex min-h-12 items-center justify-center gap-2 text-[15px] font-semibold text-slate-700 active:bg-slate-50"
            >
              {busy ? <LoaderCircle className="size-5 animate-spin" /> : <RefreshCw className="size-4" />} Солих
            </button>
            <button type="button" onClick={() => onChange('')} className="flex min-h-12 items-center justify-center gap-2 text-[15px] font-semibold text-red-600 active:bg-red-50">
              <Trash2 className="size-4" /> Устгах
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex min-h-28 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition active:bg-slate-100"
        >
          {busy ? <LoaderCircle className="size-7 animate-spin" /> : <ImagePlus className="size-7" />}
          <span className="text-[15px] font-semibold">{busy ? 'Оруулж байна…' : 'Зураг сонгох'}</span>
          <span className="text-xs">PNG, JPG · {MAX_UPLOAD_MB}MB хүртэл</span>
        </button>
      )}
    </div>
  );
}
