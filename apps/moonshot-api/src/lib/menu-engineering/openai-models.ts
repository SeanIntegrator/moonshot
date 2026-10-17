/**
 * OpenAI models tried in order on one `OPENAI_API_KEY`.
 * gpt-5.4 reads menu photos and returns strict JSON; mini and nano are the
 * cheaper fallbacks when the preferred model is overloaded or missing.
 */
import { parseProviderModelCascade } from './provider-models.js';

export const DEFAULT_OPENAI_MODEL_CASCADE = [
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
] as const;

export function parseOpenAiModelCascade(env: {
  OPENAI_MODEL?: string;
  OPENAI_MODEL_FALLBACKS?: string;
  OPENAI_MODELS?: string;
}): readonly string[] {
  return parseProviderModelCascade({
    models: env.OPENAI_MODELS,
    model: env.OPENAI_MODEL,
    fallbacks: env.OPENAI_MODEL_FALLBACKS,
    defaults: DEFAULT_OPENAI_MODEL_CASCADE,
  });
}

export const MENU_ENGINEERING_PROVIDERS = ['gemini', 'openai'] as const;
export type MenuEngineeringProviderName = (typeof MENU_ENGINEERING_PROVIDERS)[number];

/**
 * Order the cascade tries providers. A provider with no API key is skipped.
 * Default is Gemini first, then OpenAI, so an existing Gemini deployment keeps
 * its current behaviour until OpenAI is asked to go first.
 */
export function parseMenuEngineeringProviderOrder(
  raw: string | undefined,
): readonly MenuEngineeringProviderName[] {
  const requested = (raw ?? 'gemini,openai')
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is MenuEngineeringProviderName =>
      (MENU_ENGINEERING_PROVIDERS as readonly string[]).includes(part),
    );
  const seen = new Set<MenuEngineeringProviderName>();
  const out: MenuEngineeringProviderName[] = [];
  for (const name of requested) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out.length > 0 ? out : ['gemini', 'openai'];
}
