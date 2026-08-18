import type { CafeMenuSection, NormalisedMenuItem } from '@moonshot/types';
import { Box, TextField, Typography } from '@mui/material';
import { formatGbpMinor } from '../../../lib/format.js';
import { StateChip } from '../../primitives/StateChip.js';
import { isFoodItem, itemListPriceMinor, itemsBySection } from './item-sidebar.js';

type Props = {
  items: NormalisedMenuItem[];
  sections: CafeMenuSection[];
  query: string;
  selectedId: string | null;
  onQuery: (next: string) => void;
  onSelect: (id: string) => void;
};

export function ItemsSidebar({ items, sections, query, selectedId, onQuery, onSelect }: Props) {
  const groups = itemsBySection(items, sections, query);

  return (
    <Box
      sx={(theme) => ({
        width: { xs: '100%', md: 280 },
        flex: '0 0 auto',
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: `${theme.console.card.radiusPx}px`,
        bgcolor: theme.console.card.bg,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { md: 'calc(100vh - 220px)' },
      })}
    >
      <Box sx={{ p: 1.5, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search items..."
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </Box>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {groups.length === 0 ? (
          <Typography variant="body2" sx={{ px: 2, py: 2 }}>
            No items match.
          </Typography>
        ) : null}
        {groups.map((group) => (
          <Box key={group.key} sx={{ mb: 0.5 }}>
            <Typography
              sx={{
                px: 2,
                pt: 1.25,
                pb: 0.5,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'text.secondary',
              }}
            >
              {group.label.toUpperCase()}
            </Typography>
            {group.items.map((item) => {
              const selected = item.id === selectedId;
              const food = isFoodItem(item, sections);
              const unavailable = !item.isAvailable;
              const outFood = food && unavailable;
              return (
                <Box
                  key={item.id}
                  component="button"
                  type="button"
                  onClick={() => onSelect(item.id)}
                  sx={(theme) => ({
                    appearance: 'none',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    px: 2,
                    py: 1.15,
                    border: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    bgcolor: outFood
                      ? theme.console.stock.outRow
                      : selected
                        ? theme.console.stock.selectedRow
                        : 'transparent',
                    '&:hover': {
                      bgcolor: outFood
                        ? theme.console.stock.outRow
                        : theme.console.stock.selectedRow,
                    },
                  })}
                >
                  <Typography sx={{ fontWeight: 600, minWidth: 0 }}>
                    {item.name}
                    {unavailable && !outFood ? (
                      <Typography component="span" variant="body2" sx={{ fontWeight: 400 }}>
                        {' '}
                        · hidden
                      </Typography>
                    ) : null}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: '0 0 auto' }}>
                    {outFood ? <StateChip tone="red">Out</StateChip> : null}
                    <Typography variant="body2">
                      {formatGbpMinor(itemListPriceMinor(item), item.currency)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
