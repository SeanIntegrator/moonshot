import type {
  ExtractedMenuPayload,
  MenuEngineeringFindings,
  MenuEngineeringNarrative,
} from '@moonshot/types';

export type SupportedMenuImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface MenuImageInput {
  buffer: Buffer;
  mimeType: SupportedMenuImageMime;
}

/**
 * Provider-agnostic adapter for Menu Engineering vision extraction and prose narration.
 *
 * Architectural boundary:
 * - The LLM only extracts structured menu items from images and narrates prose from
 *   pre-computed `findings`.
 * - It never invents benchmark numbers or performs price comparisons itself.
 * - Swapping Gemini for OpenAI, Anthropic, or another model requires only a new
 *   implementation of this interface.
 */
export interface MenuEngineeringLlmAdapter {
  readonly providerName: string;
  extractMenuFromImages(images: readonly MenuImageInput[]): Promise<ExtractedMenuPayload>;
  narrateFindings(findings: MenuEngineeringFindings): Promise<MenuEngineeringNarrative>;
}
