/**
 * Rasterises every page of a PDF to a JPEG buffer, so the vision model sees
 * each page as an image. The brief forbids feeding Claude the PDF directly
 * because real-café PDF text extraction scrambled which price went with
 * which drink.
 *
 * Implementation notes:
 *  - pdfjs-dist v6 ships its own canvasFactory that uses @napi-rs/canvas
 *    (optional dep of pdfjs; we also depend on it directly so it is always
 *    present). No system libraries (poppler, etc.) are required.
 *  - We import the "legacy" ESM build. Despite the name, this is the Node-
 *    friendly build the pdfjs team recommends for server-side rendering —
 *    the default build targets modern browsers.
 *  - Scale 2.0 gives roughly 192 dpi for A4 — enough for the model to read
 *    body text without the file size exploding. Reduce if payloads get big.
 *  - We cap pages per PDF defensively (a 300-page restaurant guide is not a
 *    cafe menu). The route adds its own file-size cap before this is called.
 */

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * The pdfjs type declarations expose `canvasFactory` as a plain `object` so
 * TS can't see `create`/`destroy`. We know its real shape from the pdfjs
 * `BaseCanvasFactory` class.
 */
interface CanvasFactoryLike {
  create: (
    width: number,
    height: number,
  ) => { canvas: unknown; context: unknown };
  destroy: (ctx: { canvas: unknown; context: unknown }) => void;
}

const DEFAULT_SCALE = 2.0;
export const PDF_RENDER_PAGE_LIMIT = 10;

export class PdfRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfRenderError';
  }
}

export interface RenderedPage {
  jpeg: Buffer;
  pageNumber: number;
  width: number;
  height: number;
}

export async function renderPdfToImages(
  pdfBytes: Uint8Array,
  options: { scale?: number; pageLimit?: number } = {},
): Promise<RenderedPage[]> {
  const scale = options.scale ?? DEFAULT_SCALE;
  const pageLimit = options.pageLimit ?? PDF_RENDER_PAGE_LIMIT;

  const loadingTask = getDocument({ data: pdfBytes, disableFontFace: true });
  let pdfDocument;
  try {
    pdfDocument = await loadingTask.promise;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await loadingTask.destroy().catch(() => {});
    throw new PdfRenderError(`Could not open PDF: ${msg}`);
  }

  try {
    const totalPages = pdfDocument.numPages;
    const pagesToRender = Math.min(totalPages, pageLimit);
    const out: RenderedPage[] = [];
    const canvasFactory = pdfDocument.canvasFactory as CanvasFactoryLike;

    for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale });
        const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

        // pdfjs 6 renders onto `canvas`; `canvasContext` is kept for
        // back-compat only. Passing both is harmless. Casts: the pdfjs
        // types reference DOM globals we don't ship in this `lib` set, but
        // at runtime these are @napi-rs/canvas objects that pdfjs accepts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({
          canvas: canvasAndContext.canvas as any,
          canvasContext: canvasAndContext.context as any,
          viewport,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).promise;

        // JPEG is smaller than PNG for photographic/mixed menu backgrounds
        // and the vision model does not need lossless pixel accuracy.
        const jpeg = (
          canvasAndContext.canvas as { toBuffer: (mime: string, opts?: unknown) => Buffer }
        ).toBuffer('image/jpeg', { quality: 0.85 });
        out.push({ jpeg, pageNumber, width: viewport.width, height: viewport.height });

        canvasFactory.destroy(canvasAndContext);
      } finally {
        page.cleanup();
      }
    }

    return out;
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}
