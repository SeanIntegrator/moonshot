import {
  analyseMenuAgainstBenchmarks,
  buildDeterministicNarrative,
  resolveMenuEngineeringEntitlements,
  SAMPLE_UK_CAFE_MENU,
} from '@moonshot/domain';
import sharp from 'sharp';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createMoonshotHttpServer } from '../create-moonshot-http-server.js';
import { setMenuEngineeringLlmAdapterForTests } from '../lib/menu-engineering/gemini-adapter.js';
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
});
