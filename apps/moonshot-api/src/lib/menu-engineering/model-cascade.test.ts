import { buildDeterministicNarrative, SAMPLE_UK_CAFE_MENU } from '@moonshot/domain';
import { analyseMenuAgainstBenchmarks } from '@moonshot/domain';
import { ApiErrorCode } from '@moonshot/types';
import type { MenuEngineeringFindings, MenuEngineeringNarrative } from '@moonshot/types';
import { describe, expect, it, vi } from 'vitest';
import { ApiHttpError } from '../http-errors.js';
import { explainMenuEngineeringFailure } from './gemini-errors.js';
import { parseGeminiModelCascade } from './gemini-models.js';
import type { MenuEngineeringLlmAdapter, MenuNarrationOptions } from './llm-adapter.js';
import { CascadingMenuEngineeringAdapter } from './model-cascade.js';
import { parseMenuEngineeringProviderOrder, parseOpenAiModelCascade } from './openai-models.js';

function adapter(
  name: string,
  behavior: {
    extract?: () => Promise<typeof SAMPLE_UK_CAFE_MENU>;
    narrate?: (
      findings: MenuEngineeringFindings,
      options?: MenuNarrationOptions,
    ) => Promise<MenuEngineeringNarrative>;
  },
): MenuEngineeringLlmAdapter {
  return {
    providerName: name,
    extractMenuFromImages: behavior.extract ?? (async () => SAMPLE_UK_CAFE_MENU),
    narrateFindings: behavior.narrate ?? (async () => buildDeterministicNarrative(
      analyseMenuAgainstBenchmarks(SAMPLE_UK_CAFE_MENU, 'city'),
    )),
  };
}

function overloaded(model: string): ApiHttpError {
  return explainMenuEngineeringFailure(
    Object.assign(new Error('This model is currently experiencing high demand.'), { status: 503 }),
    `Gemini extract (model ${model})`,
  );
}

describe('gemini model cascade', () => {
  it('uses the configured model first, then the two default fallbacks', () => {
    expect(parseGeminiModelCascade({ GEMINI_MODEL: 'gemini-3.8-flash' })).toEqual([
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
    ]);
  });

  it('lets GEMINI_MODELS replace the default chain, capped at three', () => {
    expect(
      parseGeminiModelCascade({
        GEMINI_MODEL: 'gemini-3.8-flash',
        GEMINI_MODELS: 'gemini-3.5-flash-lite, gemini-3.6-flash, gemini-3.8-flash, gemini-2.5-flash',
      }),
    ).toEqual(['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash']);
  });

  it('tries the next model when the first is overloaded', async () => {
    const second = vi.fn(async () => SAMPLE_UK_CAFE_MENU);
    const cascade = new CascadingMenuEngineeringAdapter([
      adapter('gemini:gemini-3.8-flash', {
        extract: async () => {
          throw overloaded('gemini-3.8-flash');
        },
      }),
      adapter('gemini:gemini-3.6-flash', { extract: second }),
      adapter('gemini:gemini-3.5-flash-lite', {
        extract: async () => {
          throw new Error('should not run');
        },
      }),
    ]);

    const menu = await cascade.extractMenuFromImages([]);
    expect(menu).toBe(SAMPLE_UK_CAFE_MENU);
    expect(second).toHaveBeenCalledOnce();
  });

  it('stops on an auth failure instead of spending the fallbacks', async () => {
    const second = vi.fn(async () => SAMPLE_UK_CAFE_MENU);
    const cascade = new CascadingMenuEngineeringAdapter([
      adapter('gemini:gemini-3.8-flash', {
        extract: async () => {
          throw explainMenuEngineeringFailure(
            Object.assign(new Error('API key not valid'), { status: 401 }),
            'Gemini extract (model gemini-3.8-flash)',
          );
        },
      }),
      adapter('gemini:gemini-3.6-flash', { extract: second }),
    ]);

    await expect(cascade.extractMenuFromImages([])).rejects.toMatchObject({
      code: ApiErrorCode.CONFIG,
    });
    expect(second).not.toHaveBeenCalled();
  });

  it('continues with OpenAI after a Gemini auth failure', async () => {
    const openai = vi.fn(async () => SAMPLE_UK_CAFE_MENU);
    const cascade = new CascadingMenuEngineeringAdapter([
      adapter('gemini:gemini-3.8-flash', {
        extract: async () => {
          throw explainMenuEngineeringFailure(
            Object.assign(new Error('API key not valid'), { status: 401 }),
            'Gemini extract (model gemini-3.8-flash)',
          );
        },
      }),
      adapter('gemini:gemini-3.6-flash', {
        extract: async () => {
          throw new Error('same Gemini key should not be tried');
        },
      }),
      adapter('openai:gpt-5.4', { extract: openai }),
    ]);

    await expect(cascade.extractMenuFromImages([])).resolves.toBe(SAMPLE_UK_CAFE_MENU);
    expect(openai).toHaveBeenCalledOnce();
  });

  it('parses the OpenAI model list and provider order', () => {
    expect(parseOpenAiModelCascade({ OPENAI_MODEL: 'gpt-5.4-mini' })).toEqual([
      'gpt-5.4-mini',
      'gpt-5.4',
      'gpt-5.4-nano',
    ]);
    expect(
      parseOpenAiModelCascade({
        OPENAI_MODELS: 'gpt-5.4-nano, gpt-5.4-mini, gpt-5.4, gpt-4.1',
      }),
    ).toEqual(['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4']);
    expect(parseMenuEngineeringProviderOrder('openai, gemini, openai')).toEqual([
      'openai',
      'gemini',
    ]);
    expect(parseMenuEngineeringProviderOrder(undefined)).toEqual(['gemini', 'openai']);
  });

  it('lists every failed model when the chain is exhausted', async () => {
    const cascade = new CascadingMenuEngineeringAdapter([
      adapter('gemini:gemini-3.8-flash', {
        extract: async () => {
          throw overloaded('gemini-3.8-flash');
        },
      }),
      adapter('gemini:gemini-3.6-flash', {
        extract: async () => {
          throw overloaded('gemini-3.6-flash');
        },
      }),
    ]);

    await expect(cascade.extractMenuFromImages([])).rejects.toThrow(
      /All model attempts failed for extract.*gemini-3\.8-flash.*gemini-3\.6-flash/,
    );
  });

  it('narrates with a fallback model and uses deterministic copy when all fail', async () => {
    const findings = analyseMenuAgainstBenchmarks(SAMPLE_UK_CAFE_MENU, 'city');
    const narrated: MenuEngineeringNarrative = {
      ...buildDeterministicNarrative(findings),
      headline: 'From the second model',
      generatedBy: 'gemini',
    };
    const success = new CascadingMenuEngineeringAdapter([
      adapter('gemini:gemini-3.8-flash', {
        narrate: async () => {
          throw overloaded('gemini-3.8-flash');
        },
      }),
      adapter('gemini:gemini-3.6-flash', { narrate: async () => narrated }),
    ]);
    await expect(success.narrateFindings(findings)).resolves.toMatchObject({
      headline: 'From the second model',
    });

    const exhausted = new CascadingMenuEngineeringAdapter([
      adapter('gemini:gemini-3.8-flash', {
        narrate: async () => {
          throw overloaded('gemini-3.8-flash');
        },
      }),
    ]);
    const fallback = await exhausted.narrateFindings(findings);
    expect(fallback.generatedBy).toBe('deterministic_fallback');
    expect(fallback.modelName).toBeNull();
    expect(fallback.headline).toContain('£');
  });

  it('returns the deterministic report when narration outlives the budget', async () => {
    const findings = analyseMenuAgainstBenchmarks(SAMPLE_UK_CAFE_MENU, 'city');
    let signal: AbortSignal | undefined;
    const cascade = new CascadingMenuEngineeringAdapter(
      [
        adapter('gemini:slow', {
          narrate: (_findings, options) => {
            signal = options?.signal;
            return new Promise(() => {});
          },
        }),
      ],
      40,
    );
    const started = Date.now();
    const narrative = await cascade.narrateFindings(findings);
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(narrative.generatedBy).toBe('deterministic_fallback');
    expect(narrative.modelName).toBeNull();
    expect(signal?.aborted).toBe(true);
  });
});
