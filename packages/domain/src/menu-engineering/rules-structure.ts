import type {
  ConcreteSuggestion,
  ExtractedMenuPayload,
  ItemPriceFinding,
  LadderAndStructureFlag,
  MenuEngineeringRegionTier,
} from '@moonshot/types';
import { getBenchmarkForCanonicalItem } from './benchmarks-seed.js';

const BRUNCH_CLUSTER_THRESHOLD_POUNDS = 2.0;
const BRUNCH_MIN_ITEMS_FOR_CLUSTER = 4;
const SECTION_OVERLOAD_ITEM_COUNT = 9;
const TRADING_DAYS_PER_MONTH = 30;
export const DEFAULT_BASELINE_CUSTOMERS_PER_DAY = 120;

function formatPounds(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

/**
 * Evaluates structural and price-architecture patterns observed across real UK café menus:
 * - Coffee size upcharge spread
 * - Tight brunch clustering without a premium price anchor
 * - Syrup add-on pricing vs 60p–95p specialty benchmark
 * - Missing high-margin brunch sides (+ egg, halloumi, bacon, avocado)
 * - Overloaded sections (> 8 items)
 * - Presence of a seasonal / specials group
 */
export function evaluateLadderAndStructureFlags(
  menu: ExtractedMenuPayload,
  regionTier: MenuEngineeringRegionTier,
): LadderAndStructureFlag[] {
  const flags: LadderAndStructureFlag[] = [];

  // 1. Coffee size upcharge check
  const sizedDrinks = menu.items.filter((item) => item.sizeVariants.length >= 2);
  if (sizedDrinks.length > 0) {
    const spreads = sizedDrinks
      .map((item) => {
        const prices = item.sizeVariants.map((v) => v.pricePounds).sort((a, b) => a - b);
        return (prices[prices.length - 1] ?? 0) - (prices[0] ?? 0);
      })
      .filter((s) => s > 0);
    const avgSpread =
      spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;

    if (avgSpread > 0 && avgSpread < 0.35) {
      flags.push({
        id: 'flag-size-upcharge-narrow',
        kind: 'size_upcharge',
        severity: 'opportunity',
        title: 'Small-to-large coffee step is compressed',
        detail:
          'Typical UK specialty cafés price a size step at 40p–60p to cover extra milk volume and reward trading up.',
        evidence: `Average size spread across ${sizedDrinks.length} multi-size drinks is ${formatPounds(avgSpread)}.`,
      });
    } else if (avgSpread >= 0.35) {
      flags.push({
        id: 'flag-size-upcharge-healthy',
        kind: 'size_upcharge',
        severity: 'good',
        title: 'Clear coffee size ladder',
        detail: 'Size steps clearly differentiate regular and large pours without muddying the board.',
        evidence: `Average size spread across ${sizedDrinks.length} multi-size drinks is ${formatPounds(avgSpread)}.`,
      });
    }
  }

  // 2. Brunch clustering & anchor check
  const brunchItems = menu.items.filter((i) =>
    [
      'eggs_on_toast',
      'avocado_on_sourdough',
      'eggs_benedict_royale',
      'shakshuka_baked_eggs',
      'full_cooked_breakfast',
      'sweet_brunch_pancakes_french_toast',
      'granola_acai_bowl',
      'breakfast_brioche_bap',
      'lunch_toastie_sandwiches',
    ].includes(i.canonicalId),
  );

  if (brunchItems.length >= BRUNCH_MIN_ITEMS_FOR_CLUSTER) {
    const prices = brunchItems.map((i) => i.pricePounds).sort((a, b) => a - b);
    const minBrunch = prices[0]!;
    const maxBrunch = prices[prices.length - 1]!;
    const p25 = prices[Math.floor(prices.length * 0.2)]!;
    const p80 = prices[Math.floor(prices.length * 0.8)]!;
    const coreBand = p80 - p25;

    if (coreBand <= BRUNCH_CLUSTER_THRESHOLD_POUNDS) {
      flags.push({
        id: 'flag-brunch-clustering',
        kind: 'brunch_clustering',
        severity: 'opportunity',
        title: 'Brunch mains cluster tightly in a narrow price band',
        detail:
          'When most brunch dishes sit within £2 of each other, guests have no high-price anchor to make mid-tier dishes feel like good value.',
        evidence: `Core brunch band spans ${formatPounds(p25)} to ${formatPounds(p80)} (overall ${formatPounds(minBrunch)}–${formatPounds(maxBrunch)} across ${brunchItems.length} dishes).`,
      });
    }

    const fullBreakfastBench = getBenchmarkForCanonicalItem('full_cooked_breakfast', regionTier);
    const anchorTarget = fullBreakfastBench ? fullBreakfastBench.typicalPricePounds : 14.8;
    if (maxBrunch < anchorTarget) {
      flags.push({
        id: 'flag-missing-anchor',
        kind: 'missing_anchor',
        severity: 'opportunity',
        title: 'Missing a premium brunch anchor dish',
        detail:
          'A signature platter or royale dish near the top of the regional benchmark anchors the section and lifts mid-tier attachment.',
        evidence: `Highest brunch price is ${formatPounds(maxBrunch)} vs regional typical anchor of ${formatPounds(anchorTarget)}.`,
      });
    }
  }

  // 3. Syrup pricing check (60p–95p specialty sample benchmark)
  const allModifiers = [
    ...menu.sectionModifiers,
    ...menu.items.flatMap((i) => i.modifiers),
  ];
  const syrupModifiers = allModifiers.filter(
    (m) =>
      m.canonicalId === 'modifier_syrup_shot' ||
      /syrup|vanilla|caramel|hazelnut/i.test(m.name),
  );
  const syrupItems = menu.items.filter((i) => i.canonicalId === 'modifier_syrup_shot');
  const syrupPrices = [
    ...syrupModifiers.map((m) => m.pricePounds),
    ...syrupItems.map((i) => i.pricePounds),
  ];

  if (syrupPrices.length === 0) {
    flags.push({
      id: 'flag-syrup-missing',
      kind: 'syrup_pricing',
      severity: 'opportunity',
      title: 'House or classic syrups are not visible on the menu',
      detail:
        'Specialty cafés in our UK sample price syrups at 60p–95p with ~90% gross margin. Listing 2–3 house syrups near iced and milk coffees is an easy basket builder.',
      evidence: 'No syrup add-ons detected on the coffee section.',
    });
  } else {
    const minSyrup = Math.min(...syrupPrices);
    if (minSyrup < 0.6) {
      flags.push({
        id: 'flag-syrup-underpriced',
        kind: 'syrup_pricing',
        severity: 'opportunity',
        title: 'Syrup add-ons are priced below the 60p–95p specialty range',
        detail:
          'UK specialty cafés routinely charge 60p–95p per syrup shot. Moving from 50p to 75p rarely affects attachment rate.',
        evidence: `Detected syrup add-on at ${formatPounds(minSyrup)} (regional range £0.60–£0.95).`,
      });
    }
  }

  // 4. Brunch add-on visibility
  const brunchAddons = allModifiers.filter(
    (m) =>
      m.canonicalId === 'modifier_extra_poached_egg' ||
      m.canonicalId === 'modifier_premium_brunch_side' ||
      /egg|halloumi|bacon|avocado|salmon|chorizo/i.test(m.name),
  );
  if (brunchItems.length >= 3 && brunchAddons.length < 2) {
    flags.push({
      id: 'flag-missing-brunch-addons',
      kind: 'missing_addons',
      severity: 'opportunity',
      title: 'High-margin brunch add-ons are missing or buried',
      detail:
        'A dedicated "Add to any dish" callout box (+ poached egg £2, + halloumi £3.50, + streaky bacon £3.50) lifts average brunch spend without raising base dish prices.',
      evidence: `Found ${brunchAddons.length} explicit savoury add-on(s) across ${brunchItems.length} brunch dishes.`,
    });
  }

  // 5. Section length check
  const countBySection = new Map<string, number>();
  for (const item of menu.items) {
    countBySection.set(item.section, (countBySection.get(item.section) ?? 0) + 1);
  }
  for (const [section, count] of countBySection.entries()) {
    if (count >= SECTION_OVERLOAD_ITEM_COUNT) {
      flags.push({
        id: `flag-section-length-${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        kind: 'section_length',
        severity: 'watch',
        title: `"${section}" has ${count} items in one block`,
        detail:
          'Sections over 7–8 items cause choice fatigue at the counter; splitting into two sub-groups helps guests decide faster.',
        evidence: `${count} items listed under "${section}".`,
      });
    }
  }

  // 6. Specials / seasonal callout
  const hasSpecials =
    menu.menuGroups.includes('specials') ||
    menu.menuGroups.includes('seasonal') ||
    menu.items.some((i) => i.groupKind === 'specials' || i.groupKind === 'seasonal');
  if (!hasSpecials) {
    flags.push({
      id: 'flag-missing-specials',
      kind: 'missing_specials',
      severity: 'watch',
      title: 'No seasonal or guest-roast callout detected',
      detail:
        'A single guest filter or seasonal brunch special gives regulars a reason to trade up above your core price ladder.',
      evidence: 'All extracted items are in standard permanent sections.',
    });
  }

  return flags;
}

export function buildConcreteSuggestions(
  itemFindings: ItemPriceFinding[],
  flags: LadderAndStructureFlag[],
): ConcreteSuggestion[] {
  const suggestions: ConcreteSuggestion[] = [];

  // 1. Underpriced core coffee items
  const underpricedCoffee = itemFindings.filter(
    (f) =>
      (f.category === 'espresso_based' || f.category === 'iced_drinks' || f.category === 'tea_chai_matcha') &&
      (f.status === 'below_range' || f.status === 'in_range_low') &&
      f.deltaVsTypicalPounds !== null &&
      f.deltaVsTypicalPounds <= -0.15,
  );

  if (underpricedCoffee.length > 0) {
    const topExamples = underpricedCoffee.slice(0, 3);
    const avgGap = Math.min(
      0.35,
      Math.abs(
        topExamples.reduce((acc, item) => acc + (item.deltaVsTypicalPounds ?? 0), 0) /
          topExamples.length,
      ),
    );
    // Assume 55% of daily customers order one of these core espresso/milk drinks
    const dailyEligibleDrinks = DEFAULT_BASELINE_CUSTOMERS_PER_DAY * 0.55;
    const monthlyUplift = Math.round(dailyEligibleDrinks * avgGap * TRADING_DAYS_PER_MONTH);
    const names = topExamples.map((i) => `${i.itemName} (£${i.pricePounds.toFixed(2)} → £${(i.benchmarkTypicalPounds ?? i.pricePounds + 0.25).toFixed(2)})`).join(', ');

    suggestions.push({
      id: 'sug-core-coffee-realign',
      title: 'Bring core milk coffees in line with the regional midpoint',
      category: 'pricing',
      summary: `${underpricedCoffee.length} core drink(s) sit below typical regional specialty pricing.`,
      action: `Nudge ${names} toward the regional typical price.`,
      estimatedMonthlyUpliftPoundsAtBaseline: Math.max(120, monthlyUplift),
      assumptionsNote: `Assumes ~55% of ${DEFAULT_BASELINE_CUSTOMERS_PER_DAY} daily guests order an affected drink across ${TRADING_DAYS_PER_MONTH} trading days.`,
    });
  }

  // 2. Syrup pricing or introduction
  const syrupFlag = flags.find((f) => f.kind === 'syrup_pricing');
  if (syrupFlag) {
    // Assume 15% of daily coffee orders attach a syrup (+25p repricing or +75p net new at 90% GP)
    const monthlyUplift =
      syrupFlag.id === 'flag-syrup-missing'
        ? Math.round(DEFAULT_BASELINE_CUSTOMERS_PER_DAY * 0.12 * 0.68 * TRADING_DAYS_PER_MONTH)
        : Math.round(DEFAULT_BASELINE_CUSTOMERS_PER_DAY * 0.18 * 0.25 * TRADING_DAYS_PER_MONTH);

    suggestions.push({
      id: 'sug-syrup-tier',
      title:
        syrupFlag.id === 'flag-syrup-missing'
          ? 'Add a visible 75p house syrup callout near espresso & iced drinks'
          : 'Reprice syrup shots into the 75p–85p specialty band',
      category: 'addons',
      summary: syrupFlag.detail,
      action:
        'List 2–3 syrups (e.g. house vanilla, roasted hazelnut, salted caramel) at 75p–80p directly under espresso & iced drinks.',
      estimatedMonthlyUpliftPoundsAtBaseline: monthlyUplift,
      assumptionsNote: `Assumes 12%–18% syrup attachment across ${DEFAULT_BASELINE_CUSTOMERS_PER_DAY} daily guests at ~90% gross margin.`,
    });
  }

  // 3. Brunch add-ons callout box
  const addonsFlag = flags.find((f) => f.kind === 'missing_addons');
  if (addonsFlag) {
    // Assume 35% of guests order food, and 20% of food orders add a £3.00 side at 70% GP (£2.10 GP)
    const monthlyUplift = Math.round(
      DEFAULT_BASELINE_CUSTOMERS_PER_DAY * 0.35 * 0.2 * 2.1 * TRADING_DAYS_PER_MONTH,
    );
    suggestions.push({
      id: 'sug-brunch-addons-box',
      title: 'Pull brunch extras out of descriptions into a dedicated "Add to any dish" box',
      category: 'addons',
      summary:
        'Extras hidden inside dish descriptions are missed by most guests scanning the menu.',
      action:
        'Create a bordered callout under Brunch with 4 high-margin sides (Poached Egg £2.00, Halloumi £3.50, Streaky Bacon £3.50, Smashed Avo £3.00).',
      estimatedMonthlyUpliftPoundsAtBaseline: monthlyUplift,
      assumptionsNote: `Assumes 1 in 5 brunch covers adds a side (~£2.10 gross profit per add-on) at ${DEFAULT_BASELINE_CUSTOMERS_PER_DAY} customers/day.`,
    });
  }

  // 4. Brunch price ladder / anchor
  const clusterFlag = flags.find(
    (f) => f.kind === 'brunch_clustering' || f.kind === 'missing_anchor',
  );
  const underpricedBrunch = itemFindings.filter(
    (f) =>
      f.category === 'brunch_mains' &&
      (f.status === 'below_range' || f.status === 'in_range_low') &&
      (f.deltaVsTypicalPounds ?? 0) <= -0.5,
  );
  if (clusterFlag || underpricedBrunch.length > 0) {
    const monthlyUplift = Math.round(
      DEFAULT_BASELINE_CUSTOMERS_PER_DAY * 0.3 * 0.45 * TRADING_DAYS_PER_MONTH,
    );
    suggestions.push({
      id: 'sug-brunch-ladder',
      title: 'De-cluster brunch pricing and introduce a top-end anchor dish',
      category: 'ladder',
      summary:
        'Flat brunch pricing leaves margin on the table on high-labour dishes like Eggs Benedict or Full House plates.',
      action:
        'Separate light toast/granola dishes (£8.50–£10), core egg dishes (£12–£13.50), and a signature Royale or Full House anchor (£14.80–£16.00).',
      estimatedMonthlyUpliftPoundsAtBaseline: monthlyUplift,
      assumptionsNote: `Assumes ~30% brunch mix with a £0.45 average gross margin lift per brunch cover.`,
    });
  }

  // 5. Ensure at least 3 concrete suggestions even on well-priced menus
  if (suggestions.length < 3) {
    suggestions.push({
      id: 'sug-seasonal-filter-special',
      title: 'Add a boxed seasonal drink & guest filter pour',
      category: 'structure',
      summary:
        'A highlighted seasonal iced drink or single-origin V60 gives regular guests a reason to spend £0.80–£1.20 above a standard flat white.',
      action:
        'Feature one seasonal signature drink and one guest filter bean in a shaded callout box.',
      estimatedMonthlyUpliftPoundsAtBaseline: Math.round(
        DEFAULT_BASELINE_CUSTOMERS_PER_DAY * 0.08 * 0.85 * TRADING_DAYS_PER_MONTH,
      ),
      assumptionsNote: `Assumes 8% of daily guests trade up to the featured special (+£0.85 gross margin).`,
    });
  }

  suggestions.sort(
    (a, b) =>
      b.estimatedMonthlyUpliftPoundsAtBaseline - a.estimatedMonthlyUpliftPoundsAtBaseline,
  );
  return suggestions.slice(0, 5);
}
