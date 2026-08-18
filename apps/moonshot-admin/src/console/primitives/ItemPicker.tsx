import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

export type PickerItem = {
  id: string;
  name: string;
  sectionLabel: string;
  priceLabel: string;
  initials?: string;
  unavailableReason?: string;
};

type Props = {
  open: boolean;
  title: string;
  items: readonly PickerItem[];
  onClose: () => void;
  onSelect: (item: PickerItem) => void;
};

export function ItemPicker({ open, title, items, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => i.name.toLowerCase().includes(q) || i.sectionLabel.toLowerCase().includes(q))
      : items;
    const map = new Map<string, PickerItem[]>();
    for (const item of filtered) {
      const list = map.get(item.sectionLabel) ?? [];
      list.push(item);
      map.set(item.sectionLabel, list);
    }
    return [...map.entries()];
  }, [items, query]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2, mt: 0.5 }}
        />
        {grouped.length === 0 ? (
          <Typography variant="body2">No items match.</Typography>
        ) : (
          grouped.map(([section, sectionItems]) => (
            <Box key={section} sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{ letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 0.5 }}
              >
                {section.toUpperCase()}
              </Typography>
              {sectionItems.map((item) => {
                const dimmed = Boolean(item.unavailableReason);
                return (
                  <Box
                    key={item.id}
                    component="button"
                    type="button"
                    disabled={dimmed}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                      setQuery('');
                    }}
                    sx={{
                      appearance: 'none',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      py: 1,
                      px: 0.5,
                      border: 0,
                      bgcolor: 'transparent',
                      textAlign: 'left',
                      cursor: dimmed ? 'default' : 'pointer',
                      opacity: dimmed ? 0.55 : 1,
                      '&:hover:not(:disabled)': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={(theme) => ({
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: theme.console.readonly.fill,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      })}
                    >
                      {item.initials ?? item.name.slice(0, 2)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                      <Typography variant="body2">
                        {item.sectionLabel} · {item.priceLabel}
                      </Typography>
                    </Box>
                    {item.unavailableReason ? (
                      <Typography variant="body2">{item.unavailableReason}</Typography>
                    ) : null}
                  </Box>
                );
              })}
            </Box>
          ))
        )}
      </DialogContent>
    </Dialog>
  );
}
