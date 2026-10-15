import type {
  MenuEngineeringFindings,
  MenuEngineeringNarrative,
  MenuEngineeringRegionTier,
  PricePositionStatus,
} from '@moonshot/types';

interface MenuReportChartsProps {
  findings: MenuEngineeringFindings;
  narrative: MenuEngineeringNarrative;
  regionTier: MenuEngineeringRegionTier;
  regionLabel: string;
}

const STATUS_LABELS: Record<PricePositionStatus, string> = {
  below_range: 'Below floor',
  in_range_low: 'Low in range',
  optimal: 'Aligned',
  in_range_high: 'Upper band',
  above_range: 'Above ceiling',
  unbenchmarked: 'House custom',
};

export function MenuReportCharts({
  findings,
  narrative,
  regionLabel,
}: MenuReportChartsProps) {
  const benchmarkedItems = findings.itemFindings.filter(
    (item) =>
      item.benchmarkLowPounds !== null &&
      item.benchmarkHighPounds !== null &&
      item.benchmarkTypicalPounds !== null,
  );

  return (
    <>
      {/* Chart 1: Price vs Benchmark Range per Item */}
      <div className="me-panel">
        <div className="me-panel__head">
          <h4>Chart 1 · Item Price vs {regionLabel} Benchmark Range</h4>
          <p>{narrative.pricingCommentary}</p>
        </div>

        <div className="me-legend">
          <span>
            <i className="me-dot me-dot--below_range" /> Below range / low
          </span>
          <span>
            <i className="me-dot me-dot--optimal" /> Aligned with typical
          </span>
          <span>
            <i className="me-dot me-dot--above_range" /> Upper / above ceiling
          </span>
        </div>

        <div className="me-range-chart">
          {benchmarkedItems.map((item) => {
            const low = item.benchmarkLowPounds!;
            const typ = item.benchmarkTypicalPounds!;
            const high = item.benchmarkHighPounds!;
            const scaleMin = Math.min(low, item.pricePounds) * 0.85;
            const scaleMax = Math.max(high, item.pricePounds) * 1.12;
            const span = Math.max(0.5, scaleMax - scaleMin);

            const bandLeftPct = ((low - scaleMin) / span) * 100;
            const bandWidthPct = ((high - low) / span) * 100;
            const typicalLeftPct = ((typ - scaleMin) / span) * 100;
            const actualLeftPct = Math.min(
              98,
              Math.max(2, ((item.pricePounds - scaleMin) / span) * 100),
            );

            return (
              <div key={item.itemId} className="me-range-row">
                <div className="me-range-row__label">
                  <strong>{item.itemName}</strong>
                  <span>
                    Yours: £{item.pricePounds.toFixed(2)} · Typical: £{typ.toFixed(2)} (
                    £{low.toFixed(2)}–£{high.toFixed(2)})
                  </span>
                </div>

                <div className="me-range-row__track-wrap">
                  <div className="me-range-track">
                    <div
                      className="me-range-band"
                      style={{
                        left: `${bandLeftPct}%`,
                        width: `${bandWidthPct}%`,
                      }}
                      title={`Benchmark band: £${low.toFixed(2)} – £${high.toFixed(2)}`}
                    />
                    <div
                      className="me-range-typical"
                      style={{ left: `${typicalLeftPct}%` }}
                      title={`Regional typical: £${typ.toFixed(2)}`}
                    />
                    <div
                      className={`me-range-marker me-range-marker--${item.status}`}
                      style={{ left: `${actualLeftPct}%` }}
                      title={`Your price: £${item.pricePounds.toFixed(2)}`}
                    />
                  </div>
                </div>

                <div className="me-range-row__badge">
                  <span className={`me-status-badge me-status-badge--${item.status}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts 2 & 3: Menu Mix by Category + Estimated Gross Margin by Category */}
      <div className="me-two-col">
        <div className="me-panel">
          <div className="me-panel__head">
            <h4>Chart 2 · Menu Mix by Category</h4>
            <p>Share of menu items across drink and kitchen sections.</p>
          </div>
          <div className="me-bars">
            {findings.categorySummaries.map((cat) => (
              <div key={cat.category} className="me-bar-row">
                <div className="me-bar-row__top">
                  <span>{cat.categoryLabel}</span>
                  <strong>
                    {cat.itemCount} items ({cat.shareOfMenuPercent}%) · avg £
                    {cat.averagePricePounds.toFixed(2)}
                  </strong>
                </div>
                <div className="me-bar-track">
                  <div
                    className="me-bar-fill me-bar-fill--mix"
                    style={{ width: `${Math.max(8, cat.shareOfMenuPercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="me-panel">
          <div className="me-panel__head">
            <h4>Chart 3 · Estimated Gross Margin by Category</h4>
            <p>Based on typical UK specialty café ingredient cost % (COGS).</p>
          </div>
          <div className="me-bars">
            {findings.categorySummaries.map((cat) => (
              <div key={cat.category} className="me-bar-row">
                <div className="me-bar-row__top">
                  <span>{cat.categoryLabel}</span>
                  <strong>
                    ~{cat.estimatedGrossMarginPercent}% GP ({cat.typicalCostPercent}% COGS)
                  </strong>
                </div>
                <div className="me-bar-track">
                  <div
                    className="me-bar-fill me-bar-fill--margin"
                    style={{ width: `${cat.estimatedGrossMarginPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
