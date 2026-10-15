/**
 * The one place anything outside src/lib/menu-engineering/ should import from.
 * Keeps the module's internal file layout free to move without rippling.
 *
 * See docs/architecture/roadmap.md for the module's isolation rules — no
 * writes to existing Moonshot tables, stateless for the free tier, one API
 * surface in, one out.
 */

export { extractMenu, ExtractionError } from './extract-menu.js';
export type { ExtractMenuOptions, ExtractMenuResult } from './extract-menu.js';
export { AnthropicNotConfiguredError } from './extraction/anthropic-client.js';
export { UnsupportedInputError } from './prepare-input.js';
export type { IncomingFile } from './prepare-input.js';
export { PdfRenderError } from './pdf-render/render-pdf-to-images.js';
export {
  ExtractedMenuSchema,
  type ExtractedMenu,
  type MenuItem,
  type MenuSection,
  type ModifierGroup,
  type ModifierOption,
  type PriceVariant,
} from './extraction/schema.js';
