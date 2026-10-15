import { CANONICAL_ITEMS, inferCanonicalItemIdFromName } from '@moonshot/domain';
import type {
  CanonicalItemId,
  ExtractedMenuItem,
  ExtractedMenuPayload,
  MenuEngineeringRegionTier,
} from '@moonshot/types';

interface MenuConfirmTableProps {
  menu: ExtractedMenuPayload;
  regionTier: MenuEngineeringRegionTier;
  onRegionTierChange: (tier: MenuEngineeringRegionTier) => void;
  onMenuChange: (updated: ExtractedMenuPayload) => void;
  onRunAudit: () => void;
  onReset: () => void;
  isAnalysing: boolean;
}

export function MenuConfirmTable({
  menu,
  regionTier,
  onRegionTierChange,
  onMenuChange,
  onRunAudit,
  onReset,
  isAnalysing,
}: MenuConfirmTableProps) {
  const updateItem = (itemId: string, patch: Partial<ExtractedMenuItem>) => {
    const nextItems = menu.items.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item,
    );
    const nextSections = Array.from(new Set(nextItems.map((i) => i.section.trim() || 'General')));
    onMenuChange({
      ...menu,
      items: nextItems,
      sections: nextSections,
    });
  };

  const removeItem = (itemId: string) => {
    const nextItems = menu.items.filter((i) => i.id !== itemId);
    onMenuChange({
      ...menu,
      items: nextItems,
    });
  };

  const addItem = () => {
    const newId = `manual-${Date.now()}`;
    const newItem: ExtractedMenuItem = {
      id: newId,
      name: 'Flat White',
      section: menu.sections[0] ?? 'Espresso & Filter',
      groupKind: 'main',
      pricePounds: 3.6,
      sizeVariants: [],
      description: null,
      dietaryCodes: [],
      canonicalId: 'flat_white',
      modifiers: [],
      confidence: 'high',
    };
    onMenuChange({
      ...menu,
      items: [...menu.items, newItem],
    });
  };

  const updateModifierPrice = (modId: string, pricePounds: number) => {
    onMenuChange({
      ...menu,
      sectionModifiers: menu.sectionModifiers.map((m) =>
        m.id === modId ? { ...m, pricePounds } : m,
      ),
    });
  };

  return (
    <div className="me-confirm">
      <div className="me-confirm__header">
        <div>
          <span className="me-step-pill">Step 2 of 3 · Confirm extracted menu</span>
          <h3 className="me-confirm__title">
            Check items &amp; prices before we run the benchmark rules
          </h3>
          <p className="me-confirm__subtitle">
            Chalkboards and multi-column PDFs can have quirks. Fix any misread prices or
            canonical matches here so your report and charts are spot-on.
          </p>
        </div>

        <div className="me-confirm__controls">
          <label className="me-field-label" htmlFor="me-region-select">
            UK Region Benchmark Tier
          </label>
          <select
            id="me-region-select"
            className="me-select"
            value={regionTier}
            onChange={(e) =>
              onRegionTierChange(e.target.value as MenuEngineeringRegionTier)
            }
          >
            <option value="london">Greater London</option>
            <option value="city">UK Regional City (Brighton, Bristol, Manchester, Edinburgh)</option>
            <option value="town">UK Market Town / Suburb</option>
          </select>
        </div>
      </div>

      {menu.extractionNotes.length > 0 ? (
        <div className="me-notes-banner" role="status">
          <strong>Extraction notes:</strong>{' '}
          {menu.extractionNotes.join(' · ')}
        </div>
      ) : null}

      <div className="me-table-wrap">
        <table className="me-table">
          <thead>
            <tr>
              <th>Item name on menu</th>
              <th>Section</th>
              <th>Price (£)</th>
              <th>Sizes / Variants</th>
              <th>Benchmark match (Canonical)</th>
              <th>Dietary</th>
              <th aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {menu.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    type="text"
                    className="me-input"
                    value={item.name}
                    aria-label={`Item name for ${item.name}`}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      const inferred =
                        item.canonicalId === 'other'
                          ? inferCanonicalItemIdFromName(nextName)
                          : item.canonicalId;
                      updateItem(item.id, { name: nextName, canonicalId: inferred });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="me-input me-input--compact"
                    value={item.section}
                    aria-label={`Section for ${item.name}`}
                    onChange={(e) => updateItem(item.id, { section: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="me-input me-input--price"
                    value={item.pricePounds}
                    aria-label={`Price in pounds for ${item.name}`}
                    onChange={(e) =>
                      updateItem(item.id, {
                        pricePounds: Math.max(0, Number.parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </td>
                <td className="me-cell-muted">
                  {item.sizeVariants.length > 0
                    ? item.sizeVariants
                        .map((v) => `${v.label}: £${v.pricePounds.toFixed(2)}`)
                        .join(', ')
                    : 'Single size'}
                </td>
                <td>
                  <select
                    className="me-select me-select--row"
                    value={item.canonicalId}
                    aria-label={`Canonical benchmark match for ${item.name}`}
                    onChange={(e) =>
                      updateItem(item.id, {
                        canonicalId: e.target.value as CanonicalItemId,
                      })
                    }
                  >
                    {CANONICAL_ITEMS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    className="me-input me-input--dietary"
                    placeholder="V, VG, GF"
                    value={item.dietaryCodes.join(', ')}
                    aria-label={`Dietary codes for ${item.name}`}
                    onChange={(e) =>
                      updateItem(item.id, {
                        dietaryCodes: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="me-icon-btn"
                    title="Remove item"
                    onClick={() => removeItem(item.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {menu.sectionModifiers.length > 0 ? (
        <div className="me-modifiers-strip">
          <p className="me-modifiers-strip__title">
            Section add-ons &amp; modifiers (syrups, alt milks, extra shots):
          </p>
          <div className="me-modifiers-strip__list">
            {menu.sectionModifiers.map((mod) => (
              <div key={mod.id} className="me-modifier-chip">
                <span>{mod.name}</span>
                <label className="me-modifier-chip__price">
                  £
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={mod.pricePounds}
                    onChange={(e) =>
                      updateModifierPrice(
                        mod.id,
                        Math.max(0, Number.parseFloat(e.target.value) || 0),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="me-confirm__actions">
        <div className="me-confirm__left-actions">
          <button type="button" className="btn btn-ghost" onClick={addItem}>
            + Add menu item
          </button>
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Upload different menu
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={isAnalysing || menu.items.length === 0}
          onClick={onRunAudit}
        >
          {isAnalysing
            ? 'Running benchmark audit…'
            : `Confirm ${menu.items.length} items & generate report →`}
        </button>
      </div>
    </div>
  );
}
