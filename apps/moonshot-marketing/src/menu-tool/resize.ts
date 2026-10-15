/**
 * Client-side image resize via canvas. Shrinks phone photos (3–8 MB JPEGs,
 * sometimes 12+ MP PNGs) to something sensible before upload, which saves
 * mobile users seconds on slow connections and takes server-side token cost
 * off the vision model.
 *
 * Only runs for images the browser can decode natively (JPEG, PNG, WebP).
 * HEIC and PDF are passed through unchanged — the server already handles
 * both (sharp decodes HEIC via libheif, pdfjs rasterises PDFs).
 */

const MAX_LONG_EDGE_PX = 2000;
const JPEG_QUALITY = 0.9;

const RESIZABLE_MIME_PREFIX = /^image\/(jpeg|jpg|png|webp)$/i;

export interface ResizeResult {
  file: File;
  resized: boolean;
}

export async function resizeIfPossible(file: File): Promise<ResizeResult> {
  if (!RESIZABLE_MIME_PREFIX.test(file.type)) {
    return { file, resized: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browser could not decode (corrupt, unsupported profile, etc.) — send
    // the original and let the server deal with it.
    return { file, resized: false };
  }

  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_LONG_EDGE_PX) {
    bitmap.close();
    return { file, resized: false };
  }

  const scale = MAX_LONG_EDGE_PX / longEdge;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { file, resized: false };
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) {
    return { file, resized: false };
  }

  // Preserve the original filename stem but switch extension to .jpg so the
  // server-side mime detection (file-type, by magic bytes) agrees with the
  // name. If the original was .heic it would not have reached this path.
  const stem = file.name.replace(/\.[^./\\]+$/, '');
  const newFile = new File([blob], `${stem}.jpg`, { type: 'image/jpeg' });
  return { file: newFile, resized: true };
}
