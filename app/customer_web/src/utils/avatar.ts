export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'V';

/** Corta ao centro em quadrado e reduz (evita enviar fotos de vários MB do telemóvel). */
export async function toSquareBlob(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // respeita a orientação EXIF nos browsers actuais
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', 0.88));
}