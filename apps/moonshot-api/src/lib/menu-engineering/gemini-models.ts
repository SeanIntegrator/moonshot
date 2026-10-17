/**
 * Gemini models tried in order on one `GEMINI_API_KEY`.
 * The first entry is preferred; the rest run only after a retryable failure.
 */
import { parseProviderModelCascade } from './provider-models.js';

export const DEFAULT_GEMINI_MODEL_CASCADE = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
] as const;

export function parseGeminiModelCascade(env: {
  GEMINI_MODEL?: string;
  GEMINI_MODEL_FALLBACKS?: string;
  GEMINI_MODELS?: string;
}): readonly string[] {
  return parseProviderModelCascade({
    models: env.GEMINI_MODELS,
    model: env.GEMINI_MODEL,
    fallbacks: env.GEMINI_MODEL_FALLBACKS,
    defaults: DEFAULT_GEMINI_MODEL_CASCADE,
  });
}
