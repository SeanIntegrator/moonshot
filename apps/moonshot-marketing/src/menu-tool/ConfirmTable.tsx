import { useMemo, useState } from 'react';
import {
  SECTION_KINDS,
  type ExtractedMenu,
  type MenuItem,
  type MenuSection,
  type MenuSectionKind,
} from './types.js';

interface Props {
  initialMenu: ExtractedMenu;
  pageCount: number;
  onBack: () => void;
  onConfirm: (menu: ExtractedMenu) => void;
}

type RowId = string;

interface Row extends MenuItem {
  id: RowId;
}

interface SectionWithRows extends MenuSection {
  rows: Row[];
}

const UNSECTIONED = '__unsectioned__';

/**
 * Keep the brief's intent in mind: this step exists SO THE OWNER CAN FIX
 * MISREADS. Favour simple visible fields over a feature-rich form; add
 * modifier editing later once we see what owners actually want to change.
 *
 * Local state is the single source of truth. We never mutate the prop; the
 * parent passes `initialMenu` once and reads back on `onConfirm`.
 */
export function ConfirmTable({ initialMenu, pageCount, onBack, onConfirm }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialMenu.items.map((item, i) => ({ ...item, id: `item-${i}` })),
  );
  const [sections, setSections] = useState<MenuSection[]>(() => [...initialMenu.sections]);

  const groups = useMemo<SectionWithRows[]>(() => {
    const bySection = new Map<string, Row[]>();
    for (const row of rows) {
      const key = row.section?.trim() || UNSECTIONED;
      const bucket = bySection.get(key) ?? [];
      bucket.push(row);
      bySection.set(key, bucket);
    }

    const result: SectionWithRows[] = sections.map((s) => ({
      ...s,
      rows: bySection.get(s.name) ?? [],
    }));
    const seen = new Set(sections.map((s) => s.name));
    for (const [key, bucket] of bySection) {
      if (key === UNSECTIONED) {
        result.push({ name: 'Uncategorised', kind: 'other', rows: bucket });
        continue;
      }
      if (!seen.has(key)) {
        result.push({ name: key, kind: 'other', rows: bucket });
      }
    }
    return result;
  }, [rows, sections]);

  function updateRow(id: RowId, patch: Partial<MenuItem>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: RowId) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow(sectionName: string) {
    const trimmed = sectionName === 'Uncategorised' ? undefined : sectionName;
    setRows((prev) => [
      ...prev,
      {
        id: `item-new-${Date.now()}-${Math.random()}`,
        name: '',
        price: '',
        section: trimmed,
      },
    ]);
  }

  function renameSection(oldName: string, newName: string) {
    if (!newName.trim() || newName === oldName) return;
    setSections((prev) => prev.map((s) => (s.name === oldName ? { ...s, name: newName } : s)));
    setRows((prev) =>
      prev.map((r) => (r.section === oldName ? { ...r, section: newName } : r)),
    );
  }

  function changeSectionKind(sectionName: string, kind: MenuSectionKind) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.name === sectionName);
      if (idx === -1) return [...prev, { name: sectionName, kind }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx]!, kind };
      return copy;
    });
  }

  function confirm() {
    const cleaned: MenuItem[] = rows
      .map(({ id: _id, ...rest }) => rest)
      .filter((r) => r.name.trim().length > 0);
    onConfirm({ ...initialMenu, items: cleaned, sections });
  }

  const totalItems = rows.filter((r) => r.name.trim().length > 0).length;

  return (
    <div className="confirm">
      <div className="confirm__banner">
        We read <strong>{totalItems} items</strong> across {groups.length} section
        {groups.length === 1 ? '' : 's'} from {pageCount} image{pageCount === 1 ? '' : 's'}. Fix
        anything that looks wrong — the audit uses what you confirm here, not what we read.
        {initialMenu.notes && initialMenu.notes.length > 0 && (
          <div className="confirm__notes">
            <strong>Notes from the scan:</strong>
            <ul>
              {initialMenu.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {groups.map((group) => (
        <SectionBlock
          key={group.name}
          group={group}
          onRenameSection={renameSection}
          onKindChange={changeSectionKind}
          onUpdateRow={updateRow}
          onRemoveRow={removeRow}
          onAddRow={() => addRow(group.name)}
        />
      ))}

      <div className="confirm__footer">
        <button type="button" className="mt-btn" onClick={onBack}>
          Start over
        </button>
        <p className="confirm__footer-note">The next step runs the price audit (coming soon).</p>
        <button
          type="button"
          className="mt-btn mt-btn--primary"
          onClick={confirm}
          disabled={totalItems === 0}
        >
          Looks right — continue
        </button>
      </div>
    </div>
  );
}

interface SectionBlockProps {
  group: SectionWithRows;
  onRenameSection: (oldName: string, newName: string) => void;
  onKindChange: (sectionName: string, kind: MenuSectionKind) => void;
  onUpdateRow: (id: RowId, patch: Partial<MenuItem>) => void;
  onRemoveRow: (id: RowId) => void;
  onAddRow: () => void;
}

function SectionBlock({
  group,
  onRenameSection,
  onKindChange,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
}: SectionBlockProps) {
  const [draftName, setDraftName] = useState(group.name);

  return (
    <section className="confirm__section">
      <header className="confirm__section-header">
        <input
          className="confirm__section-name"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => onRenameSection(group.name, draftName)}
          aria-label="Section name"
        />
        <select
          className="confirm__section-kind"
          value={group.kind}
          onChange={(e) => onKindChange(group.name, e.target.value as MenuSectionKind)}
          aria-label="Section type"
        >
          {SECTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </header>

      {group.rows.map((row) => (
        <ItemRow
          key={row.id}
          row={row}
          onUpdate={(patch) => onUpdateRow(row.id, patch)}
          onRemove={() => onRemoveRow(row.id)}
        />
      ))}

      <div className="confirm__section-footer">
        <button type="button" className="confirm__add-row" onClick={onAddRow}>
          + Add item
        </button>
      </div>
    </section>
  );
}

interface ItemRowProps {
  row: Row;
  onUpdate: (patch: Partial<MenuItem>) => void;
  onRemove: () => void;
}

function ItemRow({ row, onUpdate, onRemove }: ItemRowProps) {
  const lowConfidence = typeof row.confidence === 'number' && row.confidence < 0.6;
  const priceLabel = row.variants && row.variants.length > 0
    ? row.variants.map((v) => `${v.label}: ${v.price}`).join(' · ')
    : row.price ?? '';

  return (
    <div className="confirm__item">
      <div className="confirm__item-main">
        <div className="confirm__item-name">
          <input
            className="confirm__input"
            value={row.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Item name"
          />
          {lowConfidence && (
            <span className="confirm__confidence" title="Low confidence from scan — double-check">
              check
            </span>
          )}
        </div>
        <textarea
          className="confirm__input confirm__input--description"
          value={row.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          placeholder="Description (optional)"
          rows={1}
        />
        {row.variants && row.variants.length > 0 ? (
          <div className="confirm__item-meta">Sizes: {priceLabel}</div>
        ) : (
          <input
            className="confirm__input confirm__input--price"
            value={row.price ?? ''}
            onChange={(e) => onUpdate({ price: e.target.value || undefined })}
            placeholder="Price (e.g. 3.50)"
          />
        )}
        {row.dietaryCodes && row.dietaryCodes.length > 0 && (
          <div className="confirm__item-meta">Dietary: {row.dietaryCodes.join(', ')}</div>
        )}
        {row.modifiers && row.modifiers.length > 0 && (
          <div className="confirm__item-meta">
            Modifiers: {row.modifiers.map((m) => m.name).join(', ')}
          </div>
        )}
      </div>
      <div className="confirm__item-actions">
        <button
          type="button"
          className="confirm__row-remove"
          onClick={onRemove}
          aria-label={`Remove ${row.name || 'item'}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
