import { useState } from 'react';
import {
  analyseMenu,
  extractMenu,
  loadSampleMenu,
  type MenuAuditMenu,
  type MenuAuditReport,
} from './api.js';
import './MenuAuditPage.css';

const REGIONS = ['london', 'city', 'town'] as const;

/**
 * Skeleton for `/menu-audit`. The landing page is being redesigned, so this
 * route only exercises extract → analyse and shows the API result as text.
 */
export function MenuAuditPage() {
  const [menu, setMenu] = useState<MenuAuditMenu | null>(null);
  const [report, setReport] = useState<MenuAuditReport | null>(null);
  const [regionTier, setRegionTier] = useState<(typeof REGIONS)[number]>('city');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The menu API request failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="menu-audit">
      <div className="container">
        <a className="menu-audit__back" href="/">
          Back to Moonshot
        </a>
        <p className="eyebrow">Menu engineering</p>
        <h1>Price benchmark audit</h1>
        <p className="lead">
          Temporary page for the API. Load the sample café or upload a JPEG, PNG, or WebP menu
          photo, then run the benchmark.
        </p>

        <div className="menu-audit__panel">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => {
              setReport(null);
              void run(async () => setMenu(await loadSampleMenu()));
            }}
          >
            Load sample menu
          </button>
          <label>
            Upload menu image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setReport(null);
                void run(async () => setMenu(await extractMenu(file)));
              }}
            />
          </label>
          <label>
            Region
            <select
              value={regionTier}
              disabled={busy}
              onChange={(event) =>
                setRegionTier(event.target.value as (typeof REGIONS)[number])
              }
            >
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy || !menu}
            onClick={() => {
              if (!menu) return;
              void run(async () => setReport(await analyseMenu(menu, regionTier)));
            }}
          >
            Analyse
          </button>
        </div>

        {error ? (
          <p className="menu-audit__error" role="alert">
            {error}
          </p>
        ) : null}

        {menu ? (
          <section>
            <p className="menu-audit__meta">
              {menu.cafeNameGuess ?? 'Unnamed café'} · {menu.items.length} items · {menu.sourceMode}
            </p>
            <ul className="menu-audit__list">
              {menu.items.map((item) => (
                <li key={`${item.section}-${item.name}-${item.pricePounds}`}>
                  <span>
                    {item.name}
                    <span className="menu-audit__meta"> · {item.section}</span>
                  </span>
                  <span>£{item.pricePounds.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {report ? (
          <article>
            <p className="menu-audit__meta">
              {report.narrative.modelName ?? report.narrative.generatedBy}
            </p>
            <h2>{report.narrative.headline}</h2>
            <p>{report.narrative.executiveSummary}</p>
            <ul>
              {report.suggestions.slice(0, 5).map((suggestion) => (
                <li key={suggestion.title}>
                  <strong>{suggestion.title}</strong>
                  <span className="menu-audit__meta">
                    {' '}
                    · £{suggestion.estimatedMonthlyUpliftPoundsAtBaseline}/month
                  </span>
                  <p className="desc">{suggestion.summary}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </main>
  );
}
