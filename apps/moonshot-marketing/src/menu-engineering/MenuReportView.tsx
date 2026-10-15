import type {
  MenuEngineeringAnalysisResponse,
  MenuEngineeringRegionTier,
} from '@moonshot/types';
import { useState } from 'react';
import { getAdminSignupUrl } from '../hooks/useReducedMotion.js';
import { MenuReportCharts } from './MenuReportCharts.js';

interface MenuReportViewProps {
  analysis: MenuEngineeringAnalysisResponse;
  cafeName: string | null;
  regionTier: MenuEngineeringRegionTier;
  onRegionTierChange: (tier: MenuEngineeringRegionTier) => void;
  onBackToConfirm: () => void;
  onStartOver: () => void;
}

const REGION_NAMES: Record<MenuEngineeringRegionTier, string> = {
  london: 'Greater London',
  city: 'UK Regional City',
  town: 'UK Market Town',
};

export function MenuReportView({
  analysis,
  cafeName,
  regionTier,
  onRegionTierChange,
  onBackToConfirm,
  onStartOver,
}: MenuReportViewProps) {
  const { findings, narrative, entitlements } = analysis;
  const [customersPerDay, setCustomersPerDay] = useState<number>(
    findings.baselineCustomersPerDay,
  );

  const scaleFactor = customersPerDay / Math.max(1, findings.baselineCustomersPerDay);
  const scaledMonthlyOpportunity = Math.round(
    findings.totalMonthlyOpportunityPoundsAtBaseline * scaleFactor,
  );

  const maxSuggestionUplift = Math.max(
    1,
    ...findings.suggestions.map((s) =>
      Math.round(s.estimatedMonthlyUpliftPoundsAtBaseline * scaleFactor),
    ),
  );

  return (
    <div className="me-report">
      <div className="me-report__topbar">
        <div>
          <span className="me-step-pill">Step 3 of 3 · Price &amp; Structure Audit</span>
          <h3 className="me-report__title">
            {cafeName ? `${cafeName} — ` : ''}Menu Benchmark Report
          </h3>
          <p className="me-report__meta">
            Benchmarked against <strong>{REGION_NAMES[regionTier]}</strong> specialty cafés ·{' '}
            <span>{findings.benchmarkMetadata.sourceSummary}</span>
          </p>
        </div>

        <div className="me-report__top-actions">
          <select
            className="me-select"
            aria-label="Change UK benchmark region tier"
            value={regionTier}
            onChange={(e) =>
              onRegionTierChange(e.target.value as MenuEngineeringRegionTier)
            }
          >
            <option value="london">Greater London</option>
            <option value="city">UK Regional City</option>
            <option value="town">UK Market Town</option>
          </select>
          <button type="button" className="btn btn-ghost" onClick={onBackToConfirm}>
            ← Edit items &amp; prices
          </button>
          <button type="button" className="btn btn-ghost" onClick={onStartOver}>
            New upload
          </button>
        </div>
      </div>

      {/* Opportunity Banner + Interactive Customers/Day Slider */}
      <div className="me-opportunity-card">
        <div className="me-opportunity-card__main">
          <p className="me-opportunity-card__eyebrow">
            Estimated monthly gross profit opportunity
          </p>
          <p className="me-opportunity-card__figure" data-testid="monthly-opportunity-figure">
            ~£{scaledMonthlyOpportunity.toLocaleString('en-GB')}
            <span>/month</span>
          </p>
          <p className="me-opportunity-card__headline">{narrative.headline}</p>
          <p className="me-opportunity-card__summary">{narrative.executiveSummary}</p>
        </div>

        <div className="me-opportunity-card__slider-box">
          <div className="me-slider-header">
            <label htmlFor="me-customers-slider">Daily covers / customers</label>
            <strong className="me-slider-value">{customersPerDay} / day</strong>
          </div>
          <input
            id="me-customers-slider"
            type="range"
            min={40}
            max={400}
            step={10}
            value={customersPerDay}
            onChange={(e) => setCustomersPerDay(Number(e.target.value))}
            className="me-slider"
          />
          <div className="me-slider-ticks">
            <span>40 (Quiet)</span>
            <span>120 (Typical)</span>
            <span>250 (Busy)</span>
            <span>400 (High-vol)</span>
          </div>
          <p className="me-slider-caption">
            Drag to scale the monthly opportunity estimate to your café&apos;s daily footfall.
          </p>
        </div>
      </div>

      {/* 3-5 Concrete Suggestions + Chart 4: Opportunity per Suggestion */}
      <div className="me-panel">
        <div className="me-panel__head">
          <h4>
            Chart 4 · Top {findings.suggestions.length} Concrete Menu &amp; Pricing Moves
          </h4>
          <p>
            Ranked by estimated monthly gross margin impact at {customersPerDay} customers/day.
          </p>
        </div>
        <div className="me-suggestions-list">
          {findings.suggestions.map((sug, idx) => {
            const scaledUplift = Math.round(
              sug.estimatedMonthlyUpliftPoundsAtBaseline * scaleFactor,
            );
            const widthPct = Math.max(
              10,
              Math.round((scaledUplift / maxSuggestionUplift) * 100),
            );
            return (
              <article key={sug.id} className="me-suggestion-item">
                <div className="me-suggestion-item__top">
                  <div>
                    <span className="me-suggestion-item__index">0{idx + 1}</span>
                    <span className="me-suggestion-item__cat">{sug.category}</span>
                    <h5>{sug.title}</h5>
                  </div>
                  <div className="me-suggestion-item__uplift">
                    +£{scaledUplift.toLocaleString('en-GB')}/mo
                  </div>
                </div>
                <p className="me-suggestion-item__summary">{sug.summary}</p>
                <p className="me-suggestion-item__action">
                  <strong>Action:</strong> {sug.action}
                </p>
                <div className="me-suggestion-bar-track" aria-hidden>
                  <div
                    className="me-suggestion-bar-fill"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <p className="me-suggestion-item__note">{sug.assumptionsNote}</p>
              </article>
            );
          })}
        </div>
      </div>

      <MenuReportCharts
        findings={findings}
        narrative={narrative}
        regionTier={regionTier}
        regionLabel={REGION_NAMES[regionTier]}
      />

      {/* Structure & Price Ladder Flags */}
      <div className="me-panel">
        <div className="me-panel__head">
          <h4>Price Ladder &amp; Menu Structure Flags</h4>
          <p>{narrative.structureAndLadderCommentary}</p>
        </div>
        <div className="me-flags-grid">
          {findings.ladderAndStructureFlags.map((flag) => (
            <div
              key={flag.id}
              className={`me-flag-card me-flag-card--${flag.severity}`}
            >
              <div className="me-flag-card__badge">{flag.severity}</div>
              <h5>{flag.title}</h5>
              <p>{flag.detail}</p>
              <p className="me-flag-card__evidence">{flag.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Paid Tier Gate (controlled by single `entitlements` switch) */}
      {!entitlements.canRestructureMenuLayout ? (
        <div className="me-pro-upsell">
          <div>
            <span className="me-step-pill">Coming in Moonshot Menu Studio (Paid Tier)</span>
            <h4>Turn these findings into a print-ready menu &amp; live QR board</h4>
            <ul>
              <li>
                <strong>Menu layout restructuring:</strong> auto-group sections, box high-margin
                anchors, and position add-on callouts.
              </li>
              <li>
                <strong>Copy polish:</strong> sharpen provenance &amp; dish descriptions for
                higher conversion.
              </li>
              <li>
                <strong>Printable templates &amp; hosted QR menu:</strong> export A4, A-frame,
                and table cards or publish directly to Moonshot Order-Ahead.
              </li>
            </ul>
          </div>
          <a href={getAdminSignupUrl()} className="btn btn-primary">
            Launch your café on Moonshot →
          </a>
        </div>
      ) : null}

      {/* Honest Methodology & Limits Note */}
      <div className="me-methodology-note">
        <strong>About these estimates &amp; honest limits:</strong>{' '}
        {narrative.methodologyAndLimitsNote}
      </div>
    </div>
  );
}
