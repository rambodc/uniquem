import { checkPhotoFile, toBase64 } from "../party/photo";

export const AVATAR_SIZE = 256, THUMB_SIZE = 96;
/** Centre-crops to a square and scales to `side` pixels as a JPEG (also strips camera metadata). */
async function square(bitmap: ImageBitmap, side: number, quality: number) {
  const canvas = document.createElement("canvas"), crop = Math.min(bitmap.width, bitmap.height);
  canvas.width = side; canvas.height = side;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff"; context.fillRect(0, 0, side, side);
  context.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, side, side);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("This image could not be prepared.");
  return toBase64(blob);
}
/** Checks the chosen file (JPEG, PNG or WebP, up to 5 MB) and makes the 256px avatar and 96px thumbnail the server expects, as base64 JPEGs. */
export async function prepareAvatar(file: File): Promise<{ photo: string; thumb: string }> {
  const problem = checkPhotoFile(file); if (problem) throw new Error(problem);
  let bitmap: ImageBitmap; try { bitmap = await createImageBitmap(file); } catch { throw new Error("This image could not be opened."); }
  try { return { photo: await square(bitmap, AVATAR_SIZE, 0.86), thumb: await square(bitmap, THUMB_SIZE, 0.8) }; } finally { bitmap.close(); }
}
