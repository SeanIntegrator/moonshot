import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';

/**
 * Thin, lazy, singleton accessor for the Anthropic SDK.
 *
 * Why a function and not a top-level `const`:
 *  - config.anthropicApiKey is read at boot. In non-production the API is
 *    allowed to start without it (so the rest of the app still works), and we
 *    only fail when a menu-engineering request actually arrives.
 *  - Tests inject their own transport by passing a mocked `AnthropicLike`
 *    into extract-menu.ts; they never hit this file.
 *
 * The SDK itself reads ANTHROPIC_API_KEY from the environment when apiKey is
 * omitted. We pass it explicitly so the typed `config` layer stays the single
 * read site (project convention — see src/lib/config.ts).
 */
let cached: Anthropic | null = null;

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not configured — menu-engineering extraction is unavailable');
    this.name = 'AnthropicNotConfiguredError';
  }
}

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const apiKey = config.anthropicApiKey;
  if (!apiKey) throw new AnthropicNotConfiguredError();
  cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * Minimal surface the orchestrator needs — easier to mock in tests than the
 * full Anthropic client. Only `messages.create` is used right now; add more
 * methods here (and nowhere else) if the orchestrator starts needing them.
 */
export interface AnthropicLike {
  messages: {
    create: Anthropic['messages']['create'];
  };
}

/** For tests: reset the cached client so a reloaded config takes effect. */
export function resetAnthropicClientForTests(): void {
  cached = null;
}
