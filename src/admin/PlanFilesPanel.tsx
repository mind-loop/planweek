import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ExternalLink, FileText, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useBulletin } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { todayISO } from '../lib/utils';
import { BUCKET, FILE_TYPES, MAX_UPLOAD_MB, uploadToBucket, validateUpload } from '../lib/storage';
import { Card, Skeleton } from '../components/ui';
import type { PlanFile } from '../types/database';


const inputClass =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15';

const monthName = (iso: string) => `${iso.slice(0, 4)} оны ${Number(iso.slice(5, 7))} сар`;

/** Upload the month's printable schedule (PDF/PNG/JPG) for members to download. */
export function PlanFilesPanel() {
  const toast = useToast();
  const { reload } = useBulletin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PlanFile[] | null>(null);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from('plan_files').select('*').order('month', { ascending: false }).order('created_at', { ascending: false });
    if (error) toast(error.message, 'error');
    setFiles((data as PlanFile[]) ?? []);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast('Файл сонгоно уу', 'error');
    const problem = validateUpload(file, FILE_TYPES);
    if (problem) return toast(problem, 'error');

    setBusy(true);
    let path: string;
    let url: string;
    try {
      // Printed schedules keep full resolution so small text stays readable.
      ({ path, url } = await uploadToBucket(file, `plan-files/${month}`, { shrink: false }));
    } catch (err) {
      setBusy(false);
      return toast(err instanceof Error ? err.message : 'Файл оруулж чадсангүй', 'error');
    }
    const { error } = await supabase!.from('plan_files').insert({
      month: `${month}-01`,
      title: title.trim() || null,
      file_path: path,
      file_url: url,
      mime_type: file.type || null,
    });
    setBusy(false);
    if (error) {
      await supabase!.storage.from(BUCKET).remove([path]); // don't leave an orphaned file
      return toast(error.message, 'error');
    }
    toast('Файл байршлаа');
    setTitle('');
    if (fileRef.current) fileRef.current.value = '';
    await load();
    void reload();
  };

  const remove = async (f: PlanFile) => {
    if (!window.confirm(`${monthName(f.month)}-ын файлыг устгах уу?`)) return;
    const st = await supabase!.storage.from(BUCKET).remove([f.file_path]);
    if (st.error) return toast(st.error.message, 'error');
    const { error } = await supabase!.from('plan_files').delete().eq('id', f.id);
    if (error) return toast(error.message, 'error');
    toast('Устгагдлаа');
    await load();
    void reload();
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={upload} className="space-y-4">
          <p className="text-[15px] text-slate-600">
            Бэлэн болсон сарын хуваарийг <b>PDF</b> эсвэл <b>зураг (PNG/JPG)</b> хэлбэрээр байршуулна. Хэрэглэгчид «Төлөвлөгөө» хэсгээс татаж авна.
          </p>
          <div>
            <label htmlFor="pf-month" className="mb-1.5 block text-[15px] font-semibold text-slate-700">
              Сар <span className="text-red-500">*</span>
            </label>
            <input id="pf-month" type="month" required value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pf-title" className="mb-1.5 block text-[15px] font-semibold text-slate-700">
              Гарчиг
            </label>
            <input
              id="pf-title"
              placeholder="ж: 10 сарын төлөвлөгөө"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pf-file" className="mb-1.5 block text-[15px] font-semibold text-slate-700">
              Файл <span className="text-red-500">*</span>
            </label>
            <input
              id="pf-file"
              ref={fileRef}
              type="file"
              required
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="block w-full text-[15px] text-slate-600 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-cyan-50 file:px-4 file:font-semibold file:text-cyan-800"
            />
            <p className="mt-1 text-sm text-slate-500">PDF, PNG, JPG · {MAX_UPLOAD_MB}MB хүртэл</p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />} Байршуулах
          </button>
        </form>
      </Card>

      {files === null ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : files.length === 0 ? (
        <Card className="p-6 text-center text-[15px] text-slate-500">Одоогоор файл байршуулаагүй байна.</Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 py-2.5 pl-3 pr-2">
              {f.mime_type?.startsWith('image/') ? (
                <img src={f.file_url} alt="" className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                  <FileText className="size-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{f.title || monthName(f.month)}</p>
                <p className="text-sm text-slate-500">{monthName(f.month)}</p>
              </div>
              <a
                href={f.file_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Нээх"
                className="grid size-11 place-items-center rounded-full text-cyan-700 active:bg-cyan-50"
              >
                <ExternalLink className="size-5" />
              </a>
              <button
                type="button"
                onClick={() => remove(f)}
                aria-label="Устгах"
                className="grid size-11 place-items-center rounded-full text-red-600 active:bg-red-50"
              >
                <Trash2 className="size-5" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
