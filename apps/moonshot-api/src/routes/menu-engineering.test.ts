import {
  analyseMenuAgainstBenchmarks,
  buildConcreteSuggestions,
  buildDeterministicNarrative,
  inferCanonicalItemIdFromName,
  resolveMenuEngineeringEntitlements,
  SAMPLE_UK_CAFE_MENU,
} from '@moonshot/domain';
import type { ItemPriceFinding, LadderAndStructureFlag } from '@moonshot/types';
import sharp from 'sharp';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createMoonshotHttpServer } from '../create-moonshot-http-server.js';
import { setMenuEngineeringLlmAdapterForTests } from '../lib/menu-engineering/resolve-adapter.js';
import type { MenuEngineeringLlmAdapter } from '../lib/menu-engineering/llm-adapter.js';

describe('menu-engineering domain rules & HTTP endpoints', () => {
  afterEach(() => {
    setMenuEngineeringLlmAdapterForTests(null);
  });

  it('evaluates price positioning, brunch clustering, and syrup opportunities deterministically', () => {
    const findings = analyseMenuAgainstBenchmarks(SAMPLE_UK_CAFE_MENU, 'city');

    expect(findings.regionTier).toBe('city');
    expect(findings.itemFindings.length).toBe(SAMPLE_UK_CAFE_MENU.items.length);

    const flatWhite = findings.itemFindings.find((i) => i.canonicalId === 'flat_white');
    expect(flatWhite).toBeDefined();
    expect(flatWhite?.status).toBe('below_range');
    expect(flatWhite?.benchmarkTypicalPounds).toBe(3.8);

    const flagKinds = findings.ladderAndStructureFlags.map((f) => f.kind);
    expect(flagKinds).toContain('brunch_clustering');
    expect(flagKinds).toContain('syrup_pricing');
    expect(flagKinds).toContain('missing_addons');

    expect(findings.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(findings.suggestions.length).toBeLessThanOrEqual(5);
    expect(findings.totalMonthlyOpportunityPoundsAtBaseline).toBeGreaterThan(0);
  });

  it('scales regional benchmarks higher for London and lower for UK Town', () => {
    const london = analyseMenuAgainstBenchmarks(SAMPLE_UK_CAFE_MENU, 'london');
    const town = analyseMenuAgainstBenchmarks(SAMPLE_UK_CAFE_MENU, 'town');

    const londonLatte = london.itemFindings.find((i) => i.canonicalId === 'latte');
    const townLatte = town.itemFindings.find((i) => i.canonicalId === 'latte');

    expect(londonLatte?.benchmarkTypicalPounds).toBeGreaterThan(
      townLatte?.benchmarkTypicalPounds ?? 0,
    );
  });

  it('keeps free/paid capabilities behind a single entitlement resolver', () => {
    const free = resolveMenuEngineeringEntitlements('free');
    const paid = resolveMenuEngineeringEntitlements('paid');

    expect(free.canExtractAndAuditPricing).toBe(true);
    expect(free.canRestructureMenuLayout).toBe(false);
    expect(paid.canRestructureMenuLayout).toBe(true);
    expect(paid.canExportPrintTemplates).toBe(true);
  });

  it('serves sample menu via GET /api/v1/menu-engineering/sample and analyses via POST /analyse', async () => {
    const { app } = createMoonshotHttpServer();

    const sampleRes = await request(app).get('/api/v1/menu-engineering/sample');
    expect(sampleRes.status).toBe(200);
    expect(sampleRes.body.ok).toBe(true);
    expect(sampleRes.body.data.menu.items.length).toBeGreaterThan(10);

    const analyseRes = await request(app)
      .post('/api/v1/menu-engineering/analyse')
      .send({
        menu: sampleRes.body.data.menu,
        regionTier: 'city',
        tier: 'free',
      });

    expect(analyseRes.status).toBe(200);
    expect(analyseRes.body.ok).toBe(true);
    expect(analyseRes.body.data.findings.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(analyseRes.body.data.narrative.headline).toContain('£');
    expect(analyseRes.body.data.entitlements.tier).toBe('free');
  });

  it('validates image magic bytes and invokes the configured LLM adapter on POST /extract', async () => {
    const stubAdapter: MenuEngineeringLlmAdapter = {
      providerName: 'stub-gemini',
      async extractMenuFromImages(images) {
        expect(images).toHaveLength(1);
        expect(images[0]?.mimeType).toBe('image/jpeg');
        return SAMPLE_UK_CAFE_MENU;
      },
      async narrateFindings(findings) {
        return {
          ...buildDeterministicNarrative(findings),
          generatedBy: 'gemini',
        };
      },
    };
    setMenuEngineeringLlmAdapterForTests(stubAdapter);

    const pngBuffer = await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 3,
        background: { r: 24, g: 24, b: 28 },
      },
    })
      .png()
      .toBuffer();

    const { app } = createMoonshotHttpServer();
    const res = await request(app)
      .post('/api/v1/menu-engineering/extract')
      .attach('images', pngBuffer, 'chalkboard.png');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.menu.items.length).toBe(SAMPLE_UK_CAFE_MENU.items.length);
  });

  it('prefers the more specific canonical keyword over an earlier generic one', () => {
    expect(inferCanonicalItemIdFromName('Double Espresso')).toBe('double_espresso');
    expect(inferCanonicalItemIdFromName('Iced Latte')).toBe('iced_latte');
    expect(inferCanonicalItemIdFromName('Matcha Latte')).toBe('matcha_latte');
    expect(inferCanonicalItemIdFromName('Dirty Chai')).toBe('dirty_chai');
    expect(inferCanonicalItemIdFromName('Almond Croissant')).toBe('almond_croissant');
    expect(inferCanonicalItemIdFromName('Iced Matcha Latte')).toBe('iced_matcha');
    expect(inferCanonicalItemIdFromName('Ceremonial Matcha Latte')).toBe('matcha_latte');
    expect(inferCanonicalItemIdFromName('Twice-Baked Almond Croissant')).toBe('almond_croissant');
    expect(inferCanonicalItemIdFromName('Vanilla Latte')).toBe('latte');
    expect(inferCanonicalItemIdFromName('Espresso')).toBe('espresso');
    expect(inferCanonicalItemIdFromName('Oat Milk')).toBe('modifier_plant_milk');
    expect(inferCanonicalItemIdFromName('House Special')).toBe('other');
  });

  it('ranks concrete suggestions by monthly uplift', () => {
    const latte: ItemPriceFinding = {
      itemId: 'latte-1',
      itemName: 'Latte',
      section: 'Coffee',
      canonicalId: 'latte',
      canonicalLabel: 'Caffè Latte',
      category: 'espresso_based',
      pricePounds: 3.4,
      benchmarkLowPounds: 3.5,
      benchmarkTypicalPounds: 3.6,
      benchmarkHighPounds: 4.1,
      typicalCostPercent: 17,
      estimatedGrossMarginPercent: 83,
      deltaVsTypicalPounds: -0.2,
      status: 'in_range_low',
      findingSummary: 'below typical',
      confidence: 'high',
      benchmarkSource: 'test',
    };
    const flags: LadderAndStructureFlag[] = [
      {
        id: 'flag-syrup-missing',
        kind: 'syrup_pricing',
        severity: 'opportunity',
        title: 'Syrups missing',
        detail: 'No syrups',
        evidence: 'none',
      },
      {
        id: 'flag-missing-brunch-addons',
        kind: 'missing_addons',
        severity: 'opportunity',
        title: 'Add-ons missing',
        detail: 'No add-ons',
        evidence: 'none',
      },
      {
        id: 'flag-brunch-clustering',
        kind: 'brunch_clustering',
        severity: 'opportunity',
        title: 'Clustered',
        detail: 'Tight band',
        evidence: 'narrow',
      },
    ];

    const suggestions = buildConcreteSuggestions([latte], flags);
    const uplifts = suggestions.map((s) => s.estimatedMonthlyUpliftPoundsAtBaseline);
    expect(uplifts).toEqual([...uplifts].sort((a, b) => b - a));
    expect(suggestions.map((s) => s.id)).toEqual([
      'sug-brunch-addons-box',
      'sug-brunch-ladder',
      'sug-core-coffee-realign',
      'sug-syrup-tier',
    ]);
  });

  it('returns the provider reason instead of a generic Internal error', async () => {
    const stubAdapter: MenuEngineeringLlmAdapter = {
      providerName: 'stub-gemini',
      async extractMenuFromImages() {
        const err = new Error(
          'INVALID_ARGUMENT schema too complex key=AIzaSySUPERSECRETKEYVALUE',
        );
        (err as Error & { status: number }).status = 400;
        throw err;
      },
      async narrateFindings(findings) {
        return buildDeterministicNarrative(findings);
      },
    };
    setMenuEngineeringLlmAdapterForTests(stubAdapter);

    const pngBuffer = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: { r: 24, g: 24, b: 28 },
      },
    })
      .png()
      .toBuffer();

    const { app } = createMoonshotHttpServer();
    const res = await request(app)
      .post('/api/v1/menu-engineering/extract')
      .attach('images', pngBuffer, 'chalkboard.png');

    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('provider HTTP 400');
    expect(res.body.error).toContain('schema too complex');
    expect(res.body.error).not.toContain('AIza');
    expect(res.body.error).not.toBe('Internal error');
  });

  it('rejects non-image payloads on POST /extract', async () => {
    const { app } = createMoonshotHttpServer();
    const fakeBuffer = Buffer.from('not-an-image-payload', 'utf8');

    const res = await request(app)
      .post('/api/v1/menu-engineering/extract')
      .attach('images', fakeBuffer, 'menu.txt');

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe('VALIDATION');
  });

  it('rate-limits public extract per forwarded client IP', async () => {
    const { app } = createMoonshotHttpServer();
    const blockedIp = '203.0.113.10';

    for (let i = 0; i < 15; i += 1) {
      const res = await request(app)
        .post('/api/v1/menu-engineering/extract')
        .set('X-Forwarded-For', blockedIp);
      expect(res.status).not.toBe(429);
    }

    const blocked = await request(app)
      .post('/api/v1/menu-engineering/extract')
      .set('X-Forwarded-For', blockedIp);
    expect(blocked.status).toBe(429);

    const otherVisitor = await request(app)
      .post('/api/v1/menu-engineering/extract')
      .set('X-Forwarded-For', '203.0.113.11');
    expect(otherVisitor.status).not.toBe(429);
  });
});
