import { Box, Chip } from '@mui/material';
import type { MenuCategory } from '@moonshot/types';

type Props = {
  sections: { category: MenuCategory; label: string }[];
  active: MenuCategory;
  onSelect: (category: MenuCategory) => void;
};

export function CategoryStrip({ sections, active, onSelect }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        py: 1.5,
        px: 0,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {sections.map((s) => {
        const selected = active === s.category;
        return (
          <Chip
            key={s.category}
            label={s.label}
            clickable
            disableRipple
            onClick={() => onSelect(s.category)}
            variant={selected ? 'filled' : 'outlined'}
            color={selected ? 'primary' : 'default'}
            sx={{
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              // Avoid hover/press fills that read like the selected chip.
              '&.MuiChip-clickable:hover': selected
                ? { bgcolor: 'primary.main' }
                : { bgcolor: 'transparent' },
              '&.MuiChip-clickable:active': selected
                ? { bgcolor: 'primary.main' }
                : { bgcolor: 'transparent' },
            }}
          />
        );
      })}
    </Box>
  );
}
