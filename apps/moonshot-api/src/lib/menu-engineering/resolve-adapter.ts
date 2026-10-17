import { config } from '../config.js';
import { GeminiMenuEngineeringAdapter } from './gemini-adapter.js';
import type { MenuEngineeringLlmAdapter } from './llm-adapter.js';
import { CascadingMenuEngineeringAdapter } from './model-cascade.js';
import { OpenAiMenuEngineeringAdapter } from './openai-adapter.js';
import type { MenuEngineeringProviderName } from './openai-models.js';

/**
 * Factory for the menu-engineering model cascade.
 * Tests inject a stub here so routes never call a live provider.
 */
let overrideAdapter: MenuEngineeringLlmAdapter | null = null;

export function setMenuEngineeringLlmAdapterForTests(
  adapter: MenuEngineeringLlmAdapter | null,
): void {
  overrideAdapter = adapter;
}

function adaptersForProvider(provider: MenuEngineeringProviderName): MenuEngineeringLlmAdapter[] {
  if (provider === 'gemini' && config.geminiApiKey) {
    return config.geminiModels.map(
      (model) => new GeminiMenuEngineeringAdapter(config.geminiApiKey as string, model),
    );
  }
  if (provider === 'openai' && config.openaiApiKey) {
    return config.openaiModels.map(
      (model) => new OpenAiMenuEngineeringAdapter(config.openaiApiKey as string, model),
    );
  }
  return [];
}

/**
 * Gemini and OpenAI share one cascade. A provider is included only when its
 * API key is set, in `MENU_ENGINEERING_PROVIDERS` order (default gemini, then openai).
 * Returns null when neither key is configured so the route can serve the sample menu.
 */
export function resolveMenuEngineeringLlmAdapter(): MenuEngineeringLlmAdapter | null {
  if (overrideAdapter) return overrideAdapter;

  const attempts = config.menuEngineeringProviderOrder.flatMap(adaptersForProvider);
  if (attempts.length === 0) return null;
  if (attempts.length === 1) return attempts[0] ?? null;
  return new CascadingMenuEngineeringAdapter(attempts);
}
