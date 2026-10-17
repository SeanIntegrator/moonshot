import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  ApiErrorCode,
  MENU_GROUP_KINDS,
  type ExtractedMenuPayload,
  type MenuEngineeringFindings,
  type MenuEngineeringNarrative,
} from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';
import { explainMenuEngineeringFailure } from './gemini-errors.js';
import type { MenuEngineeringLlmAdapter, MenuImageInput } from './llm-adapter.js';
import { buildMenuNarrationPrompt, MENU_EXTRACTION_INSTRUCTIONS } from './prompts.js';
import { normaliseRawModelExtraction, readModelNarrative } from './schemas.js';

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
  readonly providerName: string;
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'gemini-3.8-flash') {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
    this.providerName = `gemini:${model}`;
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
              { text: MENU_EXTRACTION_INSTRUCTIONS },
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
                text: buildMenuNarrationPrompt(findings),
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
        throw new ApiHttpError(
          502,
          ApiErrorCode.INTERNAL,
          `Gemini narrate (model ${this.model}) failed: the model returned an empty response.`,
        );
      }
      return {
        ...readModelNarrative(JSON.parse(rawText) as unknown),
        generatedBy: 'gemini',
        modelName: this.providerName,
      };
    } catch (err) {
      throw explainMenuEngineeringFailure(err, `Gemini narrate (model ${this.model})`);
    }
  }
}
