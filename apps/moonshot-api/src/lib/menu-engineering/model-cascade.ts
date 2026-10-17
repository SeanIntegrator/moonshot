import { buildDeterministicNarrative } from '@moonshot/domain';
import { ApiErrorCode } from '@moonshot/types';
import type {
  ExtractedMenuPayload,
  MenuEngineeringFindings,
  MenuEngineeringNarrative,
} from '@moonshot/types';
import {
  isRetryableMenuEngineeringError,
  MenuEngineeringAttemptError,
  sanitizeProviderMessage,
} from './gemini-errors.js';
import type { MenuEngineeringLlmAdapter, MenuImageInput } from './llm-adapter.js';
import { NARRATION_BUDGET_MS } from './provider-limits.js';

/**
 * Tries each adapter in order. A retryable failure (overload, unknown model,
 * empty read) moves to the next adapter. An auth failure skips the rest of
 * that provider — they share one key — and continues with the next provider.
 */
export class CascadingMenuEngineeringAdapter implements MenuEngineeringLlmAdapter {
  readonly providerName: string;

  constructor(
    private readonly attempts: readonly MenuEngineeringLlmAdapter[],
    private readonly narrationBudgetMs = NARRATION_BUDGET_MS,
  ) {
    if (attempts.length === 0) {
      throw new Error('Menu engineering cascade needs at least one model');
    }
    this.providerName = attempts.map((attempt) => attempt.providerName).join(' → ');
  }

  extractMenuFromImages(images: readonly MenuImageInput[]): Promise<ExtractedMenuPayload> {
    return runModelCascade(this.attempts, (attempt) => attempt.extractMenuFromImages(images), 'extract');
  }

  async narrateFindings(findings: MenuEngineeringFindings): Promise<MenuEngineeringNarrative> {
    const controller = new AbortController();
    try {
      return await withDeadline(
        runModelCascade(
          this.attempts,
          (attempt) => attempt.narrateFindings(findings, { signal: controller.signal }),
          'narrate',
        ),
        this.narrationBudgetMs,
        controller,
      );
    } catch (err) {
      console.warn(
        '[menu-engineering] narration cascade failed; using deterministic narrative',
        err instanceof Error ? err.message : String(err),
      );
      return buildDeterministicNarrative(findings);
    }
  }
}

function withDeadline<T>(
  work: Promise<T>,
  budgetMs: number,
  controller: AbortController,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Narration exceeded ${budgetMs}ms`));
    }, budgetMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function credentialGroup(providerName: string): string {
  const colon = providerName.indexOf(':');
  return colon === -1 ? providerName : providerName.slice(0, colon);
}

async function runModelCascade<T>(
  attempts: readonly MenuEngineeringLlmAdapter[],
  run: (attempt: MenuEngineeringLlmAdapter) => Promise<T>,
  operation: 'extract' | 'narrate',
): Promise<T> {
  const failures: string[] = [];
  let index = 0;
  while (index < attempts.length) {
    const attempt = attempts[index];
    if (!attempt) break;
    try {
      return await run(attempt);
    } catch (err) {
      const detail = sanitizeProviderMessage(err instanceof Error ? err.message : String(err));
      failures.push(`${attempt.providerName}: ${detail}`);
      console.warn(`[menu-engineering] ${operation} attempt failed`, attempt.providerName, detail);
      if (isRetryableMenuEngineeringError(err)) {
        index += 1;
        continue;
      }
      // Same-provider models share a key, so skip them and resume at the next provider.
      const group = credentialGroup(attempt.providerName);
      let nextIndex = index + 1;
      while (
        nextIndex < attempts.length &&
        credentialGroup(attempts[nextIndex]?.providerName ?? '') === group
      ) {
        nextIndex += 1;
      }
      if (nextIndex >= attempts.length) throw err;
      index = nextIndex;
    }
  }

  throw new MenuEngineeringAttemptError(
    502,
    ApiErrorCode.INTERNAL,
    `All model attempts failed for ${operation}. ${failures.join(' | ')}`,
    false,
  );
}
