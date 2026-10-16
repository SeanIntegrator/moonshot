/**
 * Vision/narration models tried in order. The first entry is the preferred
 * model; the rest run only when that attempt throws a retryable error
 * (overload, missing model, unreadable menu). One Gemini API key is shared.
 *
 * `GEMINI_MODELS` replaces the pair below when set (max 3).
 * Otherwise `GEMINI_MODEL` is first and `GEMINI_MODEL_FALLBACKS` follow.
 */
export const DEFAULT_GEMINI_MODEL_CASCADE = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
] as const;

const MAX_CASCADE_MODELS = 3;

function uniqueModels(models: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of models) {
    if (!model || seen.has(model)) continue;
    seen.add(model);
    out.push(model);
    if (out.length === MAX_CASCADE_MODELS) break;
  }
  return out;
}

function splitModels(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseGeminiModelCascade(env: {
  GEMINI_MODEL?: string;
  GEMINI_MODEL_FALLBACKS?: string;
  GEMINI_MODELS?: string;
}): readonly string[] {
  const explicit = splitModels(env.GEMINI_MODELS);
  if (explicit.length > 0) return uniqueModels(explicit);

  const primary = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL_CASCADE[0];
  const fallbacks = env.GEMINI_MODEL_FALLBACKS?.trim()
    ? splitModels(env.GEMINI_MODEL_FALLBACKS)
    : DEFAULT_GEMINI_MODEL_CASCADE.filter((model) => model !== primary);
  return uniqueModels([primary, ...fallbacks]);
}
