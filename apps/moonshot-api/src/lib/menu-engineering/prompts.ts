import { CANONICAL_ITEMS } from '@moonshot/domain';
import type { MenuEngineeringFindings } from '@moonshot/types';

const CANONICAL_REFERENCE_LIST = CANONICAL_ITEMS.map(
  (item) => `${item.id} (${item.label})`,
).join(', ');

/** Shared extraction instructions. Canonical ids stay in the prompt, not a giant schema enum. */
export const MENU_EXTRACTION_INSTRUCTIONS = `You are a specialist UK café menu data extractor.
Extract every food and drink item visible in the menu image(s) into structured JSON.
Rules:
1. Convert all prices to GBP decimal numbers (e.g., "3.5" or "£3.50" -> 3.5, "65p" -> 0.65).
2. If coffee/drinks have multiple size columns (e.g. Small/Reg/Large or 8oz/12oz), set pricePounds to the primary/regular size and list all sizes in sizeVariants.
3. Capture modifiers/add-ons:
   - If an add-on applies to a whole section (e.g. "Syrups +75p", "Oat milk +40p", "Extra shot +80p", "Add to any brunch dish: Halloumi +3.5"), place it in sectionModifiers.
   - If an add-on is embedded inside a specific dish description (e.g. "add poached egg +1.5"), attach it to that item's modifiers array.
4. Normalise dietary codes (e.g., VG, V, GF, GFO, N, DF).
5. Map every item and modifier to the closest canonicalId from this exact list: ${CANONICAL_REFERENCE_LIST}. Use "other" only when no canonical item fits.
6. Always include every schema field. Use an empty array when there are no sizes, dietary codes, modifiers, section modifiers, or notes. Use null for cafeNameGuess, description, and targetSection when they are unknown.`;

export function buildMenuNarrationPrompt(findings: MenuEngineeringFindings): string {
  return `You are writing a concise, supportive UK specialty café pricing & structure report.
CRITICAL RULE: Use ONLY the numbers and findings in the provided JSON. Never invent prices, percentages, or benchmarks. Use soft, practical language ("typical UK specialty cafés", "estimated opportunity"). End methodologyAndLimitsNote by noting that full Stars/Plowhorses/Puzzles/Dogs matrix engineering requires POS sales volume data.

Findings JSON:
${JSON.stringify({
  regionTier: findings.regionTier,
  baselineCustomersPerDay: findings.baselineCustomersPerDay,
  totalMonthlyOpportunityPoundsAtBaseline: findings.totalMonthlyOpportunityPoundsAtBaseline,
  ladderAndStructureFlags: findings.ladderAndStructureFlags,
  suggestions: findings.suggestions,
  categorySummaries: findings.categorySummaries,
})}`;
}
