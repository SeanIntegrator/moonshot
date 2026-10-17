import { ApiErrorCode, type ExtractedMenuPayload, type MenuEngineeringFindings, type MenuEngineeringNarrative } from '@moonshot/types';
import OpenAI from 'openai';
import { ApiHttpError } from '../http-errors.js';
import { explainMenuEngineeringFailure } from './gemini-errors.js';
import type {
  MenuEngineeringLlmAdapter,
  MenuImageInput,
  MenuNarrationOptions,
} from './llm-adapter.js';
import { MENU_MODEL_HTTP_TIMEOUT_MS, MENU_MODEL_MAX_ATTEMPTS } from './provider-limits.js';
import { OPENAI_EXTRACTION_JSON_SCHEMA, OPENAI_NARRATIVE_JSON_SCHEMA } from './openai-schema.js';
import { buildMenuNarrationPrompt, MENU_EXTRACTION_INSTRUCTIONS } from './prompts.js';
import { normaliseRawModelExtraction, readModelNarrative } from './schemas.js';

/**
 * OpenAI vision + narration for the same MenuEngineeringLlmAdapter contract Gemini uses.
 * Images stay in memory and are sent as data URLs. The model never sees benchmark maths.
 */
export class OpenAiMenuEngineeringAdapter implements MenuEngineeringLlmAdapter {
  readonly providerName: string;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'gpt-5.4') {
    this.client = new OpenAI({
      apiKey,
      timeout: MENU_MODEL_HTTP_TIMEOUT_MS,
      maxRetries: MENU_MODEL_MAX_ATTEMPTS - 1,
    });
    this.model = model;
    this.providerName = `openai:${model}`;
  }

  async extractMenuFromImages(images: readonly MenuImageInput[]): Promise<ExtractedMenuPayload> {
    let text: string;
    try {
      text = await this.complete(
        [
          { type: 'text', text: MENU_EXTRACTION_INSTRUCTIONS },
          ...images.map((image) => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:${image.mimeType};base64,${image.buffer.toString('base64')}`,
              detail: 'auto' as const,
            },
          })),
        ],
        'extracted_menu',
        OPENAI_EXTRACTION_JSON_SCHEMA,
        8000,
      );
    } catch (err) {
      throw explainMenuEngineeringFailure(err, `OpenAI extract (model ${this.model})`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (err) {
      throw explainMenuEngineeringFailure(err, `OpenAI extract (model ${this.model}) returned non-JSON`);
    }

    const normalised = normaliseRawModelExtraction(parsed, 'openai_vision');
    if (normalised.items.length === 0) {
      throw new ApiHttpError(
        422,
        ApiErrorCode.VALIDATION,
        'No readable menu items with prices were detected in the uploaded image(s). Try a clearer photo or add items manually.',
      );
    }
    return normalised;
  }

  async narrateFindings(
    findings: MenuEngineeringFindings,
    options?: MenuNarrationOptions,
  ): Promise<MenuEngineeringNarrative> {
    try {
      const text = await this.complete(
        [{ type: 'text', text: buildMenuNarrationPrompt(findings) }],
        'menu_narrative',
        OPENAI_NARRATIVE_JSON_SCHEMA,
        2500,
        options?.signal,
      );
      return {
        ...readModelNarrative(JSON.parse(text) as unknown),
        generatedBy: 'openai',
        modelName: this.providerName,
      };
    } catch (err) {
      throw explainMenuEngineeringFailure(err, `OpenAI narrate (model ${this.model})`);
    }
  }

  private async complete(
    content: OpenAI.Chat.ChatCompletionContentPart[],
    schemaName: string,
    schema: object,
    maxCompletionTokens: number,
    signal?: AbortSignal,
  ): Promise<string> {
    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        temperature: 0.1,
        max_completion_tokens: maxCompletionTokens,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            strict: true,
            schema: schema as { [key: string]: unknown },
          },
        },
        messages: [{ role: 'user', content }],
      },
      { signal },
    );

    const message = response.choices[0]?.message;
    if (message?.refusal) {
      throw new ApiHttpError(
        422,
        ApiErrorCode.VALIDATION,
        `OpenAI ${schemaName} (model ${this.model}) refused the request: ${message.refusal}`,
      );
    }
    const text = message?.content?.trim();
    if (!text) {
      throw new ApiHttpError(
        502,
        ApiErrorCode.INTERNAL,
        `OpenAI ${schemaName} (model ${this.model}) failed: the model returned an empty response.`,
      );
    }
    return text;
  }
}
