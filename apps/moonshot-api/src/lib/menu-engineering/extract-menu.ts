/**
 * Orchestrator: files -> prepared images -> vision model -> parsed menu JSON.
 *
 * This is the only place menu-engineering talks to the LLM. The route in
 * src/routes/menu-engineering.ts calls `extractMenu(...)`; everything else
 * downstream (normalisation, rules engine, report) will take an
 * ExtractedMenu as input and know nothing about the model.
 *
 * The model call uses Claude Opus 5.5 (vision + strong structured JSON). The
 * client is injectable so tests mock just `messages.create` without touching
 * the SDK. On a real call we expect a single text block containing the JSON
 * object — we instruct the model to return no commentary and parse it through
 * ExtractedMenuSchema.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ExtractedMenuSchema, type ExtractedMenu } from './extraction/schema.js';
import { EXTRACTION_SYSTEM_PROMPT } from './extraction/prompt.js';
import { getAnthropicClient, type AnthropicLike } from './extraction/anthropic-client.js';
import { prepareImagesForExtraction, type IncomingFile } from './prepare-input.js';

/**
 * Vision-capable, high-accuracy. Picked over Haiku/Sonnet because handwritten
 * chalkboards are the hardest input in the brief's test set and this is a
 * foundational piece. Cost tune later with a model config/env override if
 * extraction accuracy at a cheaper tier proves acceptable.
 */
const EXTRACTION_MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16_000;

/**
 * Keywords Anthropic's structured-output grammar rejects. Enums, `required`,
 * and `additionalProperties: false` stay so a menu cannot omit `sections[].kind`
 * or add keys the strict Zod schema would 502 on.
 */
const UNSUPPORTED_OUTPUT_SCHEMA_KEYWORDS = [
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
] as const;

const EXTRACTION_OUTPUT_SCHEMA = extractionOutputSchema();

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export interface ExtractMenuOptions {
  files: IncomingFile[];
  /** Test seam: pass a fake client with just `messages.create` to avoid live calls. */
  client?: AnthropicLike;
}

export interface ExtractMenuResult {
  menu: ExtractedMenu;
  /** For debugging & telemetry — never shown to users. */
  meta: {
    pageCount: number;
    inputTokens?: number;
    outputTokens?: number;
    stopReason?: string | null;
  };
}

export async function extractMenu(options: ExtractMenuOptions): Promise<ExtractMenuResult> {
  const prepared = await prepareImagesForExtraction(options.files);
  const client = options.client ?? getAnthropicClient();

  const content: Array<
    | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }
    | { type: 'text'; text: string }
  > = prepared.map((p) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: p.jpeg.toString('base64'),
    },
  }));

  // Trailing text block instructs the model what to do with the images above.
  // Images-before-text is Anthropic's documented convention and generally
  // produces better results.
  content.push({
    type: 'text',
    text: 'Return the structured JSON for the menu(s) in the image(s) above, following every rule in the system prompt. Only the JSON object, no fences, no commentary.',
  });

  let response;
  try {
    response = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: MAX_TOKENS,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
      // The system prompt covers behaviour only. This is what forces `kind`
      // and forbids extra keys — see EXTRACTION_SYSTEM_PROMPT.
      output_config: {
        format: {
          type: 'json_schema',
          schema: EXTRACTION_OUTPUT_SCHEMA,
        },
      },
    });
  } catch (e) {
    throw new ExtractionError('Vision model call failed', e);
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) {
    throw new ExtractionError('Vision model returned no text block');
  }

  const parsedJson = parseJsonLoose(textBlock.text);
  if (parsedJson === undefined) {
    throw new ExtractionError('Vision model response was not valid JSON');
  }

  const parsed = ExtractedMenuSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ExtractionError(
      `Vision model response did not match the expected shape: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`
    );
  }

  return {
    menu: parsed.data,
    meta: {
      pageCount: prepared.length,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      stopReason: response.stop_reason,
    },
  };
}

function extractionOutputSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(ExtractedMenuSchema) as Record<string, unknown>;
  delete schema.$schema;
  stripUnsupportedOutputSchemaKeywords(schema);
  return schema;
}

function stripUnsupportedOutputSchemaKeywords(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) stripUnsupportedOutputSchemaKeywords(item);
    return;
  }
  const record = node as Record<string, unknown>;
  for (const key of UNSUPPORTED_OUTPUT_SCHEMA_KEYWORDS) delete record[key];
  for (const value of Object.values(record)) stripUnsupportedOutputSchemaKeywords(value);
}

/**
 * Models usually return the raw JSON object but occasionally wrap it in
 * ```json fences despite the instruction. Strip common wrappers before
 * parsing. We do NOT attempt to fix malformed JSON — Zod rejection surfaces
 * as a 502 with a clear message so the client can retry.
 */
function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();

  // Strip ``` or ```json fences if present.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}
