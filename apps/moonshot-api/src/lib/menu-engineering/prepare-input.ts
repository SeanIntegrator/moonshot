/**
 * Normalises uploaded files into JPEG buffers the vision model can read.
 *
 * Why one place:
 *  - A phone photo may arrive as HEIC/HEIF (iPhones), PNG, or JPEG.
 *  - A PDF menu needs to be rasterised to one JPEG per page (see brief).
 *  - The vision model takes JPEG/PNG/WebP/GIF; we standardise on JPEG for
 *    size, so the orchestrator never has to case on media type.
 *
 * File identity comes from file-type (magic bytes), not the client-supplied
 * mimetype — browsers lie, especially about HEIC.
 */

import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { renderPdfToImages } from './pdf-render/render-pdf-to-images.js';

export class UnsupportedInputError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedInputError';
  }
}

/**
 * Max pixels on the long edge after resize. The vision model is tuned for
 * roughly 1568px on the long edge — larger wastes tokens, smaller loses
 * legibility on handwritten chalkboards. Tune later from real menus.
 */
const MAX_LONG_EDGE_PX = 1568;
const JPEG_QUALITY = 85;

/** Mimes the vision model accepts. */
const ACCEPTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export interface PreparedImage {
  /** Standardised JPEG bytes ready to base64-encode for the model. */
  jpeg: Buffer;
  /** Where this image came from, for logs and debug UIs — never shown to users. */
  source: {
    originalName?: string;
    kind: 'image' | 'pdf-page';
    pdfPageNumber?: number;
  };
}

export interface IncomingFile {
  buffer: Buffer;
  originalName?: string;
}

export async function prepareImagesForExtraction(files: IncomingFile[]): Promise<PreparedImage[]> {
  if (files.length === 0) {
    throw new UnsupportedInputError('No files provided');
  }

  const out: PreparedImage[] = [];
  for (const file of files) {
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected) {
      throw new UnsupportedInputError(`Could not determine the type of "${file.originalName ?? 'file'}"`);
    }

    if (detected.mime === 'application/pdf') {
      const pages = await renderPdfToImages(new Uint8Array(file.buffer));
      for (const page of pages) {
        out.push({
          jpeg: await resizeToJpeg(page.jpeg),
          source: { originalName: file.originalName, kind: 'pdf-page', pdfPageNumber: page.pageNumber },
        });
      }
      continue;
    }

    // HEIC/HEIF photos: sharp can decode when libvips is built with HEIF.
    // On platforms without HEIF support sharp throws here, which surfaces
    // as a 400 to the user — correct behaviour (we don't want to pretend
    // we handled an image we couldn't actually read).
    if (
      ACCEPTED_IMAGE_MIMES.has(detected.mime) ||
      detected.mime === 'image/heic' ||
      detected.mime === 'image/heif'
    ) {
      out.push({
        jpeg: await resizeToJpeg(file.buffer),
        source: { originalName: file.originalName, kind: 'image' },
      });
      continue;
    }

    throw new UnsupportedInputError(
      `Unsupported file type ${detected.mime} for "${file.originalName ?? 'file'}". Send a JPEG, PNG, WebP, HEIC, or PDF.`,
    );
  }

  return out;
}

async function resizeToJpeg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_LONG_EDGE_PX, height: MAX_LONG_EDGE_PX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}
