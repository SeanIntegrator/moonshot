/**
 * Shared parser for a provider's model list. Each provider keeps its own
 * default names and env vars; the cap and the override rules stay in one place.
 *
 * `MODELS` replaces the pair below when set (max 3).
 * Otherwise `MODEL` is first and `MODEL_FALLBACKS` follow.
 */
export const MAX_PROVIDER_MODELS = 3;

function uniqueModels(models: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of models) {
    if (!model || seen.has(model)) continue;
    seen.add(model);
    out.push(model);
    if (out.length === MAX_PROVIDER_MODELS) break;
  }
  return out;
}

function splitModels(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseProviderModelCascade(input: {
  models?: string;
  model?: string;
  fallbacks?: string;
  defaults: readonly string[];
}): readonly string[] {
  const explicit = splitModels(input.models);
  if (explicit.length > 0) return uniqueModels(explicit);

  const primary = input.model?.trim() || input.defaults[0] || 'unknown-model';
  const fallbacks = input.fallbacks?.trim()
    ? splitModels(input.fallbacks)
    : input.defaults.filter((model) => model !== primary);
  return uniqueModels([primary, ...fallbacks]);
}
