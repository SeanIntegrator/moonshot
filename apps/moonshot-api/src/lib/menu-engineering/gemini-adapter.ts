import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  buildDeterministicNarrative,
  CANONICAL_ITEMS,
} from '@moonshot/domain';
import {
  ApiErrorCode,
  MENU_GROUP_KINDS,
  type ExtractedMenuPayload,
  type MenuEngineeringFindings,
  type MenuEngineeringNarrative,
} from '@moonshot/types';
import { config } from '../config.js';
import { ApiHttpError } from '../http-errors.js';
import { explainMenuEngineeringFailure } from './gemini-errors.js';
import type { MenuEngineeringLlmAdapter, MenuImageInput } from './llm-adapter.js';
import { normaliseRawModelExtraction } from './schemas.js';

const CANONICAL_REFERENCE_LIST = CANONICAL_ITEMS.map(
  (c) => `${c.id} (${c.label})`,
).join(', ');

const EXTRACTION_SYSTEM_PROMPT = `You are a specialist UK café menu data extractor.
Extract every food and drink item visible in the menu image(s) into structured JSON.
Rules:
1. Convert all prices to GBP decimal numbers (e.g., "3.5" or "£3.50" -> 3.5, "65p" -> 0.65).
2. If coffee/drinks have multiple size columns (e.g. Small/Reg/Large or 8oz/12oz), set pricePounds to the primary/regular size and list all sizes in sizeVariants.
3. Capture modifiers/add-ons:
   - If an add-on applies to a whole section (e.g. "Syrups +75p", "Oat milk +40p", "Extra shot +80p", "Add to any brunch dish: Halloumi +3.5"), place it in sectionModifiers.
   - If an add-on is embedded inside a specific dish description (e.g. "add poached egg +1.5"), attach it to that item's modifiers array.
4. Normalise dietary codes (e.g., VG, V, GF, GFO, N, DF).
5. Map every item and modifier to the closest canonicalId from this exact list: ${CANONICAL_REFERENCE_LIST}. Use "other" only when no canonical item fits.`;

const EXTRACTION_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['items', 'sectionModifiers', 'extractionNotes'],
  properties: {
    cafeNameGuess: { type: Type.STRING, nullable: true },
    sectionModifiers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['name', 'pricePounds'],
        properties: {
          name: { type: Type.STRING },
          pricePounds: { type: Type.NUMBER },
          targetSection: { type: Type.STRING, nullable: true },
          // Free string on purpose. Repeating the ~47-value canonical enum on
          // every item and modifier makes Gemini reject the schema (HTTP 400),
          // which previously surfaced as a generic "Internal error".
          canonicalId: { type: Type.STRING },
        },
      },
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['name', 'section', 'pricePounds', 'canonicalId', 'confidence'],
        properties: {
          name: { type: Type.STRING },
          section: { type: Type.STRING },
          groupKind: {
            type: Type.STRING,
            enum: [...MENU_GROUP_KINDS],
          },
          pricePounds: { type: Type.NUMBER },
          sizeVariants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['label', 'pricePounds'],
              properties: {
                label: { type: Type.STRING },
                pricePounds: { type: Type.NUMBER },
              },
            },
          },
          description: { type: Type.STRING, nullable: true },
          dietaryCodes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          canonicalId: { type: Type.STRING },
          modifiers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['name', 'pricePounds'],
              properties: {
                name: { type: Type.STRING },
                pricePounds: { type: Type.NUMBER },
                canonicalId: { type: Type.STRING },
              },
            },
          },
          confidence: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
          },
        },
      },
    },
    extractionNotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
};

const NARRATIVE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'headline',
    'executiveSummary',
    'pricingCommentary',
    'structureAndLadderCommentary',
    'methodologyAndLimitsNote',
  ],
  properties: {
    headline: { type: Type.STRING },
    executiveSummary: { type: Type.STRING },
    pricingCommentary: { type: Type.STRING },
    structureAndLadderCommentary: { type: Type.STRING },
    methodologyAndLimitsNote: { type: Type.STRING },
  },
};

export class GeminiMenuEngineeringAdapter implements MenuEngineeringLlmAdapter {
  readonly providerName = 'gemini';
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async extractMenuFromImages(
    images: readonly MenuImageInput[],
  ): Promise<ExtractedMenuPayload> {
    const inlineParts = images.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.buffer.toString('base64'),
      },
    }));

    let text: string | undefined;
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              ...inlineParts,
              { text: EXTRACTION_SYSTEM_PROMPT },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });
      text = response.text;
    } catch (err) {
      throw explainMenuEngineeringFailure(err, `Gemini extract (model ${this.model})`);
    }

    if (!text) {
      throw new ApiHttpError(
        502,
        ApiErrorCode.INTERNAL,
        `Gemini extract (model ${this.model}) failed: the model returned an empty response while reading the menu image.`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (err) {
      throw explainMenuEngineeringFailure(
        err,
        `Gemini extract (model ${this.model}) returned non-JSON`,
      );
    }
    const normalised = normaliseRawModelExtraction(parsed);
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
  ): Promise<MenuEngineeringNarrative> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are writing a concise, supportive UK specialty café pricing & structure report.
CRITICAL RULE: Use ONLY the numbers and findings in the provided JSON. Never invent prices, percentages, or benchmarks. Use soft, practical language ("typical UK specialty cafés", "estimated opportunity"). End methodologyAndLimitsNote by noting that full Stars/Plowhorses/Puzzles/Dogs matrix engineering requires POS sales volume data.

Findings JSON:
${JSON.stringify({
  regionTier: findings.regionTier,
  baselineCustomersPerDay: findings.baselineCustomersPerDay,
  totalMonthlyOpportunityPoundsAtBaseline:
    findings.totalMonthlyOpportunityPoundsAtBaseline,
  ladderAndStructureFlags: findings.ladderAndStructureFlags,
  suggestions: findings.suggestions,
  categorySummaries: findings.categorySummaries,
})}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: NARRATIVE_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        return buildDeterministicNarrative(findings);
      }
      const parsed = JSON.parse(rawText) as Omit<MenuEngineeringNarrative, 'generatedBy'>;
      return {
        ...parsed,
        generatedBy: 'gemini',
      };
    } catch (err) {
      console.warn(
        '[menu-engineering] Gemini narration failed; falling back to deterministic narrative:',
        err instanceof Error ? err.message : String(err),
      );
      return buildDeterministicNarrative(findings);
    }
  }
}

/**
 * Factory that returns the configured LLM adapter.
 * Allows tests to inject a stub adapter without live network calls.
 */
let overrideAdapter: MenuEngineeringLlmAdapter | null = null;

export function setMenuEngineeringLlmAdapterForTests(
  adapter: MenuEngineeringLlmAdapter | null,
): void {
  overrideAdapter = adapter;
}

export function resolveMenuEngineeringLlmAdapter(): MenuEngineeringLlmAdapter | null {
  if (overrideAdapter) return overrideAdapter;
  if (config.geminiApiKey) {
    return new GeminiMenuEngineeringAdapter(config.geminiApiKey, config.geminiModel);
  }
  return null;
}
