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
      {sections.map((s) => (
        <Chip
          key={s.category}
          label={s.label}
          onClick={() => onSelect(s.category)}
          variant={active === s.category ? 'filled' : 'outlined'}
          color={active === s.category ? 'primary' : 'default'}
          sx={{
            flexShrink: 0,
            transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease',
            WebkitTapHighlightColor: 'transparent',
            '&:active': {
              transform: 'scale(0.96)',
            },
          }}
        />
      ))}
    </Box>
  );
}
