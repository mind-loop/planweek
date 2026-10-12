import { supabase } from './supabaseClient';

/** Single public bucket for everything admins upload (images + monthly PDFs). */
export const BUCKET = 'church';
export const MAX_UPLOAD_MB = 10;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf'];

/** Mongolian error text, or null when the file is fine. */
export function validateUpload(file: File, allowed: string[], { checkSize = true }: { checkSize?: boolean } = {}): string | null {
  if (!allowed.includes(file.type)) {
    return allowed.includes('application/pdf') ? 'Зөвхөн PDF, PNG, JPG файл оруулна' : 'Зөвхөн PNG, JPG зураг оруулна';
  }
  if (checkSize && file.size > MAX_UPLOAD_MB * 1024 * 1024) return `Файл ${MAX_UPLOAD_MB}MB-аас бага байх ёстой`;
  return null;
}

const MAX_EDGE = 1920; // px — plenty for a phone screen, even at 3× density
const SHRINK_ABOVE = 600 * 1024; // leave already-small images untouched

/**
 * Phones upload 3–12 MB photos; on mobile data that makes banners appear slowly
 * (or not at all). Large images are scaled down and re-encoded as JPEG.
 * Anything that fails here just uploads the original.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= SHRINK_ABOVE) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // browsers apply EXIF rotation here
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff'; // transparent PNG areas → white instead of black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Uploads to `church/<folder>/<timestamp>-<random>.<ext>` and returns its public URL. */
export async function uploadToBucket(
  original: File,
  folder: string,
  { shrink = true }: { shrink?: boolean } = {},
): Promise<{ path: string; url: string }> {
  const file = shrink ? await shrinkImage(original) : original;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`Файл ${MAX_UPLOAD_MB}MB-аас бага байх ёстой`);
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
