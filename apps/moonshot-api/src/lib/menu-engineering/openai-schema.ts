import { MENU_GROUP_KINDS } from '@moonshot/types';

/**
 * Strict JSON schemas for OpenAI structured outputs.
 * Every property is required and additionalProperties is false — that is what
 * `strict: true` accepts. Canonical ids stay free strings; the prompt lists them
 * and `normaliseRawModelExtraction` repairs unknown values.
 */
const nullableString = { type: ['string', 'null'] } as const;

const modifierSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'pricePounds', 'targetSection', 'canonicalId'],
  properties: {
    name: { type: 'string' },
    pricePounds: { type: 'number' },
    targetSection: nullableString,
    canonicalId: { type: 'string' },
  },
} as const;

export const OPENAI_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cafeNameGuess', 'sectionModifiers', 'items', 'extractionNotes'],
  properties: {
    cafeNameGuess: nullableString,
    sectionModifiers: {
      type: 'array',
      items: modifierSchema,
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'section',
          'groupKind',
          'pricePounds',
          'sizeVariants',
          'description',
          'dietaryCodes',
          'canonicalId',
          'modifiers',
          'confidence',
        ],
        properties: {
          name: { type: 'string' },
          section: { type: 'string' },
          groupKind: { type: 'string', enum: [...MENU_GROUP_KINDS] },
          pricePounds: { type: 'number' },
          sizeVariants: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'pricePounds'],
              properties: {
                label: { type: 'string' },
                pricePounds: { type: 'number' },
              },
            },
          },
          description: nullableString,
          dietaryCodes: { type: 'array', items: { type: 'string' } },
          canonicalId: { type: 'string' },
          modifiers: { type: 'array', items: modifierSchema },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    extractionNotes: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const OPENAI_NARRATIVE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headline',
    'executiveSummary',
    'pricingCommentary',
    'structureAndLadderCommentary',
    'methodologyAndLimitsNote',
  ],
  properties: {
    headline: { type: 'string' },
    executiveSummary: { type: 'string' },
    pricingCommentary: { type: 'string' },
    structureAndLadderCommentary: { type: 'string' },
    methodologyAndLimitsNote: { type: 'string' },
  },
} as const;
