export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export function checkPhotoFile(file: { type: string; size: number }): string {
  if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPEG, PNG or WebP image.";
  if (file.size > PHOTO_MAX_BYTES) return "That image is over 5 MB. Choose a smaller one.";
  return "";
}
async function render(bitmap: ImageBitmap, maxSide: number, type: string, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("This image could not be prepared.");
  return blob;
}
const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("This image could not be read.")); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.readAsDataURL(blob); });
/** Resizes in the browser (also strips camera metadata): a 1600px photo and a small thumbnail, as base64. */
export async function preparePhoto(file: File): Promise<{ photo: string; thumb: string; previewUrl: string }> {
  const problem = checkPhotoFile(file); if (problem) throw new Error(problem);
  let bitmap: ImageBitmap; try { bitmap = await createImageBitmap(file); } catch { throw new Error("This image could not be opened."); }
  let photo = await render(bitmap, 1600, "image/jpeg", 0.85);
  if (photo.size > 2 * 1024 * 1024) photo = await render(bitmap, 1280, "image/jpeg", 0.75);
  let thumb = await render(bitmap, 360, "image/jpeg", 0.7);
  if (thumb.size > 28 * 1024) thumb = await render(bitmap, 280, "image/jpeg", 0.6);
  bitmap.close();
  return { photo: await toBase64(photo), thumb: await toBase64(thumb), previewUrl: URL.createObjectURL(photo) };
}
