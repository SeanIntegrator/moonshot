/**
 * Client-side normalisation pipeline for menu uploads:
 * - Converts `.heic`/`.heif` phone photos to JPEG
 * - Renders each page of a `.pdf` menu to a high-contrast `<canvas>` JPEG so column
 *   layout and price alignment are preserved for the vision LLM
 * - Resizes camera photos to max 1800px and encodes as JPEG (`quality: 0.86`)
 */

const MAX_DIMENSION_PX = 1800;
const JPEG_QUALITY = 0.86;
const MAX_PDF_PAGES = 6;

export interface PreparedMenuPageImage {
  file: File;
  previewUrl: string;
  label: string;
}

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function convertHeicToBlob(file: File): Promise<Blob> {
  const mod = await import('heic2any');
  const heic2any = mod.default;
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: JPEG_QUALITY,
  });
  return Array.isArray(converted) ? converted[0]! : converted;
}

async function resizeImageBlobToJpegFile(
  blob: Blob,
  outputName: string,
): Promise<PreparedMenuPageImage> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(
    1,
    MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height, 1),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser 2D canvas context is unavailable');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode JPEG image'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  const safeName = outputName.replace(/\.[^.]+$/, '') + '.jpg';
  const file = new File([jpegBlob], safeName, { type: 'image/jpeg' });
  return {
    file,
    previewUrl: URL.createObjectURL(jpegBlob),
    label: safeName,
  };
}

async function renderPdfPagesToJpegFiles(
  pdfFile: File,
): Promise<PreparedMenuPageImage[]> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrlMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrlMod.default;

  const buffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdfDoc = await loadingTask.promise;
  const pageCount = Math.min(pdfDoc.numPages, MAX_PDF_PAGES);
  const results: PreparedMenuPageImage[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const targetScale = Math.min(
      2.2,
      MAX_DIMENSION_PX / Math.max(unscaledViewport.width, unscaledViewport.height, 1),
    );
    const viewport = page.getViewport({ scale: Math.max(1.2, targetScale) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser 2D canvas context is unavailable for PDF rendering');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode PDF page to JPEG'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });

    const baseName = pdfFile.name.replace(/\.pdf$/i, '');
    const fileName = `${baseName}-page-${pageNum}.jpg`;
    results.push({
      file: new File([jpegBlob], fileName, { type: 'image/jpeg' }),
      previewUrl: URL.createObjectURL(jpegBlob),
      label: `${pdfFile.name} (p.${pageNum})`,
    });
  }

  return results;
}

export async function prepareSelectedMenuFiles(
  fileList: FileList | readonly File[],
): Promise<PreparedMenuPageImage[]> {
  const files = Array.from(fileList);
  const output: PreparedMenuPageImage[] = [];

  for (const file of files) {
    if (isPdfFile(file)) {
      const pages = await renderPdfPagesToJpegFiles(file);
      output.push(...pages);
    } else if (isHeicFile(file)) {
      const converted = await convertHeicToBlob(file);
      output.push(await resizeImageBlobToJpegFile(converted, file.name));
    } else {
      output.push(await resizeImageBlobToJpegFile(file, file.name));
    }
  }

  return output.slice(0, MAX_PDF_PAGES);
}
