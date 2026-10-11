import { supabase } from './supabaseClient';

/** Single public bucket for everything admins upload (images + monthly PDFs). */
export const BUCKET = 'church';
export const MAX_UPLOAD_MB = 10;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf'];

/** Mongolian error text, or null when the file is fine. */
export function validateUpload(file: File, allowed: string[]): string | null {
  if (!allowed.includes(file.type)) {
    return allowed.includes('application/pdf') ? 'Зөвхөн PDF, PNG, JPG файл оруулна' : 'Зөвхөн PNG, JPG зураг оруулна';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `Файл ${MAX_UPLOAD_MB}MB-аас бага байх ёстой`;
  return null;
}

/** Uploads to `church/<folder>/<timestamp>-<random>.<ext>` and returns its public URL. */
export async function uploadToBucket(file: File, folder: string): Promise<{ path: string; url: string }> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase!.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, url: supabase!.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

/** Best-effort delete of an object given its public URL (ignored if it isn't ours). */
export async function removeByUrl(url: string | null | undefined): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  if (!url || i < 0) return;
  await supabase!.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length).split('?')[0])]);
}
