import type { CafeMenuSection, NormalisedMenuItem } from '@moonshot/types';
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { MenuSectionBlock } from './MenuSectionBlock.js';

type DraftItem = NormalisedMenuItem & { attachedGroupIds: string[] };

type Props = {
  sections: CafeMenuSection[];
  items: NormalisedMenuItem[];
  sectionBusyId: string | null;
  togglingId: string | null;
  draftFor: (item: NormalisedMenuItem) => DraftItem;
  onToggleSection: (section: CafeMenuSection, enabled: boolean) => void;
  onToggleAvailability: (item: NormalisedMenuItem, next: boolean) => void;
  renderEditor: (draft: DraftItem, itemId: string) => ReactNode;
};

/**
 * Renders café sections as a two-level tree: top-level parents, then indented children.
 * Empty disabled sections are hidden unless they have a food kind (always shown for empty state).
 */
export function MenuSectionTree({
  sections,
  items,
  sectionBusyId,
  togglingId,
  draftFor,
  onToggleSection,
  onToggleAvailability,
  renderEditor,
}: Props) {
  const sorted = [...sections].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
  const topLevel = sorted.filter((s) => !s.parentKey);
  const childrenOf = new Map<string, CafeMenuSection[]>();
  for (const s of sorted) {
    if (!s.parentKey) continue;
    const list = childrenOf.get(s.parentKey) ?? [];
    list.push(s);
    childrenOf.set(s.parentKey, list);
  }

  const shownKeys = new Set<string>();

  function renderBlock(section: CafeMenuSection, indent: boolean) {
    const categoryItems = items.filter((item) => item.category === section.key);
    const isFood = section.kind === 'food' || section.key === 'food';
    if (!isFood && categoryItems.length === 0 && !section.enabled) {
      return null;
    }
    shownKeys.add(section.key);
    return (
      <Box key={section.id} sx={{ pl: indent ? 2 : 0, borderLeft: indent ? 2 : 0, borderColor: 'divider' }}>
        <MenuSectionBlock
          section={section}
          items={categoryItems}
          sectionBusyId={sectionBusyId}
          togglingId={togglingId}
          draftFor={draftFor}
          onToggleSection={onToggleSection}
          onToggleAvailability={onToggleAvailability}
          renderEditor={renderEditor}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight: '70vh', overflowY: 'auto', minWidth: 0 }}>
      {topLevel.map((parent) => {
        const kids = childrenOf.get(parent.key) ?? [];
        return (
          <Box key={parent.id}>
            {renderBlock(parent, false)}
            {kids.map((child) => renderBlock(child, true))}
          </Box>
        );
      })}
      {/* Orphan sections whose parent is missing */}
      {sorted
        .filter((s) => s.parentKey && !shownKeys.has(s.key) && !topLevel.some((t) => t.key === s.parentKey))
        .map((s) => renderBlock(s, false))}
    </Box>
  );
}
