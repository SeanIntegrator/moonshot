import type {
  CanonicalMenuCategory,
  CategoryMarginSummary,
  ExtractedMenuPayload,
  ItemPriceFinding,
  MenuEngineeringFindings,
  MenuEngineeringNarrative,
  MenuEngineeringRegionTier,
  PricePositionStatus,
} from '@moonshot/types';
import {
  BENCHMARK_LAST_REVIEWED,
  BENCHMARK_SOURCE_SUMMARY,
  getBenchmarkForCanonicalItem,
} from './benchmarks-seed.js';
import {
  CANONICAL_CATEGORY_LABELS,
  getCanonicalItemMeta,
  inferCanonicalItemIdFromName,
} from './canonical-items.js';
import {
  buildConcreteSuggestions,
  DEFAULT_BASELINE_CUSTOMERS_PER_DAY,
  evaluateLadderAndStructureFlags,
} from './rules-structure.js';

function roundTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function classifyPricePosition(
  price: number,
  low: number,
  typical: number,
  high: number,
): PricePositionStatus {
  if (price < low - 0.01) return 'below_range';
  if (price > high + 0.01) return 'above_range';
  const bandTolerance = Math.max(0.12, (high - low) * 0.18);
  if (Math.abs(price - typical) <= bandTolerance) return 'optimal';
  return price < typical ? 'in_range_low' : 'in_range_high';
}

function describeItemFinding(
  itemName: string,
  price: number,
  low: number,
  typical: number,
  high: number,
  status: PricePositionStatus,
): string {
  const delta = price - typical;
  const formattedDelta = `${delta >= 0 ? '+' : '-'}£${Math.abs(delta).toFixed(2)}`;
  switch (status) {
    case 'below_range':
      return `${itemName} (£${price.toFixed(2)}) sits £${(low - price).toFixed(2)} below the regional floor (£${low.toFixed(2)}–£${high.toFixed(2)}).`;
    case 'in_range_low':
      return `${itemName} (£${price.toFixed(2)}) is inside the regional range (£${low.toFixed(2)}–£${high.toFixed(2)}) but ${formattedDelta} vs typical (£${typical.toFixed(2)}).`;
    case 'optimal':
      return `${itemName} (£${price.toFixed(2)}) is aligned with the regional typical price (£${typical.toFixed(2)}).`;
    case 'in_range_high':
      return `${itemName} (£${price.toFixed(2)}) sits toward the upper end of the regional range (£${low.toFixed(2)}–£${high.toFixed(2)}).`;
    case 'above_range':
      return `${itemName} (£${price.toFixed(2)}) is £${(price - high).toFixed(2)} above the regional ceiling (£${high.toFixed(2)}) — ensure provenance or presentation justifies the premium.`;
    default:
      return `${itemName} (£${price.toFixed(2)}) is a custom house item with no direct regional benchmark row.`;
  }
}

export function evaluateItemPriceFindings(
  menu: ExtractedMenuPayload,
  regionTier: MenuEngineeringRegionTier,
): ItemPriceFinding[] {
  return menu.items.map((item): ItemPriceFinding => {
    const resolvedCanonicalId =
      item.canonicalId === 'other'
        ? inferCanonicalItemIdFromName(item.name)
        : item.canonicalId;
    const meta = getCanonicalItemMeta(resolvedCanonicalId);
    const bench = getBenchmarkForCanonicalItem(resolvedCanonicalId, regionTier);

    if (!bench) {
      const grossMargin = 100 - meta.defaultCostPercent;
      return {
        itemId: item.id,
        itemName: item.name,
        section: item.section,
        canonicalId: resolvedCanonicalId,
        canonicalLabel: meta.label,
        category: meta.category,
        pricePounds: item.pricePounds,
        benchmarkLowPounds: null,
        benchmarkTypicalPounds: null,
        benchmarkHighPounds: null,
        typicalCostPercent: meta.defaultCostPercent,
        estimatedGrossMarginPercent: grossMargin,
        deltaVsTypicalPounds: null,
        status: 'unbenchmarked',
        findingSummary: `${item.name} (£${item.pricePounds.toFixed(2)}) is a house specialty without a direct canonical benchmark.`,
        confidence: item.confidence,
        benchmarkSource: null,
      };
    }

    const status = classifyPricePosition(
      item.pricePounds,
      bench.lowPricePounds,
      bench.typicalPricePounds,
      bench.highPricePounds,
    );
    const delta = roundTwoDecimals(item.pricePounds - bench.typicalPricePounds);
    const grossMargin = roundTwoDecimals(100 - bench.typicalCostPercent);

    return {
      itemId: item.id,
      itemName: item.name,
      section: item.section,
      canonicalId: resolvedCanonicalId,
      canonicalLabel: meta.label,
      category: bench.category,
      pricePounds: item.pricePounds,
      benchmarkLowPounds: bench.lowPricePounds,
      benchmarkTypicalPounds: bench.typicalPricePounds,
      benchmarkHighPounds: bench.highPricePounds,
      typicalCostPercent: bench.typicalCostPercent,
      estimatedGrossMarginPercent: grossMargin,
      deltaVsTypicalPounds: delta,
      status,
      findingSummary: describeItemFinding(
        item.name,
        item.pricePounds,
        bench.lowPricePounds,
        bench.typicalPricePounds,
        bench.highPricePounds,
        status,
      ),
      confidence: item.confidence,
      benchmarkSource: bench.source,
    };
  });
}

export function computeCategorySummaries(
  itemFindings: ItemPriceFinding[],
): CategoryMarginSummary[] {
  const totalItems = Math.max(1, itemFindings.length);
  const grouped = new Map<CanonicalMenuCategory, ItemPriceFinding[]>();

  for (const finding of itemFindings) {
    const list = grouped.get(finding.category) ?? [];
    list.push(finding);
    grouped.set(finding.category, list);
  }

  return Array.from(grouped.entries())
    .map(([category, items]): CategoryMarginSummary => {
      const avgPrice =
        items.reduce((sum, i) => sum + i.pricePounds, 0) / items.length;
      const avgCost =
        items.reduce((sum, i) => sum + (i.typicalCostPercent ?? 28), 0) /
        items.length;
      return {
        category,
        categoryLabel: CANONICAL_CATEGORY_LABELS[category],
        itemCount: items.length,
        shareOfMenuPercent: Math.round((items.length / totalItems) * 100),
        averagePricePounds: roundTwoDecimals(avgPrice),
        typicalCostPercent: Math.round(avgCost),
        estimatedGrossMarginPercent: Math.round(100 - avgCost),
      };
    })
    .sort((a, b) => b.itemCount - a.itemCount);
}

/**
 * Pure deterministic rules engine: compares the confirmed menu against the UK
 * benchmark table for `regionTier` and produces the single `findings` JSON that
 * powers both the charts and the prose report.
 */
export function analyseMenuAgainstBenchmarks(
  menu: ExtractedMenuPayload,
  regionTier: MenuEngineeringRegionTier,
): MenuEngineeringFindings {
  const itemFindings = evaluateItemPriceFindings(menu, regionTier);
  const ladderAndStructureFlags = evaluateLadderAndStructureFlags(menu, regionTier);
  const categorySummaries = computeCategorySummaries(itemFindings);
  const suggestions = buildConcreteSuggestions(itemFindings, ladderAndStructureFlags);
  const totalMonthlyOpportunityPoundsAtBaseline = suggestions.reduce(
    (sum, s) => sum + s.estimatedMonthlyUpliftPoundsAtBaseline,
    0,
  );

  return {
    regionTier,
    baselineCustomersPerDay: DEFAULT_BASELINE_CUSTOMERS_PER_DAY,
    totalMonthlyOpportunityPoundsAtBaseline,
    itemFindings,
    ladderAndStructureFlags,
    categorySummaries,
    suggestions,
    benchmarkMetadata: {
      sourceSummary: BENCHMARK_SOURCE_SUMMARY,
      lastReviewed: BENCHMARK_LAST_REVIEWED,
    },
  };
}

const REGION_LABEL: Record<MenuEngineeringRegionTier, string> = {
  london: 'Greater London',
  city: 'UK Regional City',
  town: 'UK Market Town',
};

/**
 * Deterministic prose builder derived strictly from `findings`.
 * Used when no narration model is configured, or when every model attempt fails.
 */
export function buildDeterministicNarrative(
  findings: MenuEngineeringFindings,
): MenuEngineeringNarrative {
  const regionName = REGION_LABEL[findings.regionTier];
  const belowCount = findings.itemFindings.filter(
    (f) => f.status === 'below_range' || f.status === 'in_range_low',
  ).length;
  const optimalCount = findings.itemFindings.filter((f) => f.status === 'optimal').length;
  const highCount = findings.itemFindings.filter(
    (f) => f.status === 'in_range_high' || f.status === 'above_range',
  ).length;

  return {
    headline: `Estimated £${findings.totalMonthlyOpportunityPoundsAtBaseline.toLocaleString('en-GB')}/month gross profit opportunity against ${regionName} specialty café benchmarks`,
    executiveSummary: `Across ${findings.itemFindings.length} audited menu items, ${optimalCount} sit right on the ${regionName} typical benchmark, ${belowCount} sit below the midpoint where small 15p–35p adjustments or clearer add-on callouts can recover margin, and ${highCount} sit at the upper end of the regional range.`,
    pricingCommentary:
      belowCount > 0
        ? `Several high-frequency items sit toward the bottom of the ${regionName} specialty range. Because specialty coffee and brunch guests choose independent cafés for quality rather than lowest price, nudging under-indexed core drinks and syrups toward the regional typical figure is the lowest-risk way to protect gross margin.`
        : `Your core pricing is well aligned with ${regionName} benchmarks. Focus on attachment rate (syrups, premium sides, and seasonal specials) rather than broad base-price increases.`,
    structureAndLadderCommentary:
      findings.ladderAndStructureFlags.length > 0
        ? findings.ladderAndStructureFlags.map((f) => `${f.title}: ${f.detail}`).join(' ')
        : 'Menu section lengths and price steps look balanced across categories.',
    methodologyAndLimitsNote:
      'All figures are soft estimates based on typical UK specialty café prices and industry cost-of-goods percentages. Because this free audit does not use till volume data, it measures price positioning and menu structure — full Stars / Plowhorses / Puzzles / Dogs matrix engineering requires POS sales mix.',
    generatedBy: 'deterministic_fallback',
    modelName: null,
  };
}
