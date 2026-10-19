"use client";

// Phone photos are often 5-20 MB; uploads go through the Next proxy, which has a body
// size cap, and a 2000px JPEG is plenty for a product page. Anything that isn't a
// readable image (PDF, HEIC the browser can't decode) is sent unchanged.
const MAX_SIDE = 2000;
const SKIP_BELOW = 1024 * 1024; // already small enough

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export const shrinkImages = (files: File[]) => Promise.all(files.map(shrinkImage));
