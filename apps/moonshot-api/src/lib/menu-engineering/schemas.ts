import {
  CANONICAL_ITEM_IDS,
  MENU_ENGINEERING_REGION_TIERS,
  MENU_ENGINEERING_TIERS,
  MENU_GROUP_KINDS,
  type CanonicalItemId,
  type ExtractedMenuPayload,
  type MenuEngineeringNarrative,
} from '@moonshot/types';
import { inferCanonicalItemIdFromName } from '@moonshot/domain';
import { z } from 'zod';

const canonicalItemSet = new Set<string>(CANONICAL_ITEM_IDS);

function coerceCanonicalItemId(raw: string | undefined, itemName: string): CanonicalItemId {
  if (raw && canonicalItemSet.has(raw)) {
    return raw as CanonicalItemId;
  }
  return inferCanonicalItemIdFromName(itemName);
}

export const extractedSizeVariantSchema = z.object({
  label: z.string().trim().min(1).max(60),
  pricePounds: z.number().nonnegative().max(500),
});

export const extractedMenuModifierSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  pricePounds: z.number().nonnegative().max(100),
  scope: z.enum(['item', 'section']),
  targetSection: z.string().trim().max(120).optional(),
  canonicalId: z.enum(CANONICAL_ITEM_IDS).optional(),
});

export const extractedMenuItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  section: z.string().trim().min(1).max(120),
  groupKind: z.enum(MENU_GROUP_KINDS).default('main'),
  pricePounds: z.number().nonnegative().max(500),
  sizeVariants: z.array(extractedSizeVariantSchema).max(8).default([]),
  description: z.string().trim().max(500).nullable().default(null),
  dietaryCodes: z.array(z.string().trim().max(20)).max(12).default([]),
  canonicalId: z.enum(CANONICAL_ITEM_IDS).default('other'),
  modifiers: z.array(extractedMenuModifierSchema).max(20).default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('high'),
});

export const extractedMenuPayloadSchema = z.object({
  cafeNameGuess: z.string().trim().max(160).nullable().default(null),
  sections: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  menuGroups: z.array(z.enum(MENU_GROUP_KINDS)).max(10).default(['main']),
  sectionModifiers: z.array(extractedMenuModifierSchema).max(40).default([]),
  items: z.array(extractedMenuItemSchema).min(1).max(200),
  extractionNotes: z.array(z.string().trim().max(300)).max(20).default([]),
  sourceMode: z.enum(['gemini_vision', 'openai_vision', 'sample_preset']).default('gemini_vision'),
});

export const menuEngineeringAnalysisRequestSchema = z.object({
  menu: extractedMenuPayloadSchema,
  regionTier: z.enum(MENU_ENGINEERING_REGION_TIERS).default('city'),
  tier: z.enum(MENU_ENGINEERING_TIERS).optional().default('free'),
});

/**
 * Normalises raw JSON returned by a vision model into a clean `ExtractedMenuPayload`,
 * ensuring deterministic IDs, valid canonical item IDs, and deduplicated section lists.
 */
export function normaliseRawModelExtraction(
  raw: unknown,
  sourceMode: ExtractedMenuPayload['sourceMode'] = 'gemini_vision',
): ExtractedMenuPayload {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items = rawItems
    .map((entry, idx) => {
      const item = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
      const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Item ${idx + 1}`;
      const section =
        typeof item.section === 'string' && item.section.trim() ? item.section.trim() : 'General';
      const sizeVariants = Array.isArray(item.sizeVariants)
        ? item.sizeVariants
            .map((v) => {
              const sv = typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
              const label = typeof sv.label === 'string' ? sv.label.trim() : '';
              const pricePounds = Number(sv.pricePounds);
              return label && Number.isFinite(pricePounds) && pricePounds >= 0
                ? { label, pricePounds }
                : null;
            })
            .filter((v): v is { label: string; pricePounds: number } => v !== null)
        : [];

      const rawPrice = Number(item.pricePounds);
      const pricePounds =
        Number.isFinite(rawPrice) && rawPrice > 0
          ? rawPrice
          : (sizeVariants[0]?.pricePounds ?? 0);

      const canonicalId = coerceCanonicalItemId(
        typeof item.canonicalId === 'string' ? item.canonicalId : undefined,
        name,
      );

      const modifiers = Array.isArray(item.modifiers)
        ? item.modifiers
            .map((m, mIdx) => {
              const mod = typeof m === 'object' && m !== null ? (m as Record<string, unknown>) : {};
              const modName = typeof mod.name === 'string' ? mod.name.trim() : '';
              const modPrice = Number(mod.pricePounds);
              if (!modName || !Number.isFinite(modPrice) || modPrice < 0) return null;
              return {
                id: `item-${idx + 1}-mod-${mIdx + 1}`,
                name: modName,
                pricePounds: modPrice,
                scope: 'item' as const,
                canonicalId: coerceCanonicalItemId(
                  typeof mod.canonicalId === 'string' ? mod.canonicalId : undefined,
                  modName,
                ),
              };
            })
            .filter((m): m is NonNullable<typeof m> => m !== null)
        : [];

      const groupKindRaw = typeof item.groupKind === 'string' ? item.groupKind : 'main';
      const groupKind = (MENU_GROUP_KINDS as readonly string[]).includes(groupKindRaw)
        ? (groupKindRaw as ExtractedMenuPayload['items'][number]['groupKind'])
        : 'main';

      const confidenceRaw = typeof item.confidence === 'string' ? item.confidence : 'high';
      const confidence =
        confidenceRaw === 'low' || confidenceRaw === 'medium' ? confidenceRaw : 'high';

      return {
        id: `extracted-${idx + 1}`,
        name,
        section,
        groupKind,
        pricePounds,
        sizeVariants,
        description:
          typeof item.description === 'string' && item.description.trim()
            ? item.description.trim()
            : null,
        dietaryCodes: Array.isArray(item.dietaryCodes)
          ? item.dietaryCodes
              .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
              .map((d) => d.trim().toUpperCase())
          : [],
        canonicalId,
        modifiers,
        confidence: confidence as 'high' | 'medium' | 'low',
      };
    })
    .filter((i) => i.pricePounds > 0);

  const sectionModifiers = Array.isArray(obj.sectionModifiers)
    ? obj.sectionModifiers
        .map((m, mIdx) => {
          const mod = typeof m === 'object' && m !== null ? (m as Record<string, unknown>) : {};
          const modName = typeof mod.name === 'string' ? mod.name.trim() : '';
          const modPrice = Number(mod.pricePounds);
          if (!modName || !Number.isFinite(modPrice) || modPrice < 0) return null;
          return {
            id: `sec-mod-${mIdx + 1}`,
            name: modName,
            pricePounds: modPrice,
            scope: 'section' as const,
            targetSection:
              typeof mod.targetSection === 'string' && mod.targetSection.trim()
                ? mod.targetSection.trim()
                : undefined,
            canonicalId: coerceCanonicalItemId(
              typeof mod.canonicalId === 'string' ? mod.canonicalId : undefined,
              modName,
            ),
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null)
    : [];

  const sections = Array.from(new Set(items.map((i) => i.section)));
  const menuGroups = Array.from(new Set(['main' as const, ...items.map((i) => i.groupKind)]));

  return {
    cafeNameGuess:
      typeof obj.cafeNameGuess === 'string' && obj.cafeNameGuess.trim()
        ? obj.cafeNameGuess.trim()
        : null,
    sections,
    menuGroups,
    sectionModifiers,
    items,
    extractionNotes: Array.isArray(obj.extractionNotes)
      ? obj.extractionNotes.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      : [],
    sourceMode,
  };
}

const NARRATIVE_FIELDS = [
  'headline',
  'executiveSummary',
  'pricingCommentary',
  'structureAndLadderCommentary',
  'methodologyAndLimitsNote',
] as const;

/** Pull the five prose fields out of a model JSON object. Missing text is a failed attempt. */
export function readModelNarrative(
  raw: unknown,
): Omit<MenuEngineeringNarrative, 'generatedBy' | 'modelName'> {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const narrative = {} as Omit<MenuEngineeringNarrative, 'generatedBy' | 'modelName'>;
  for (const field of NARRATIVE_FIELDS) {
    const value = obj[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Model narration was missing ${field}.`);
    }
    narrative[field] = value.trim();
  }
  return narrative;
}
