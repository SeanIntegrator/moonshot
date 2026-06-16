import { UK_FSA_ALLERGENS } from '@moonshot/types';
import { Box, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';

type Props = {
  selected: string[];
  onChange: (allergens: string[]) => void;
};

const LABELS: Record<string, string> = {
  celery: 'Celery',
  cereals_with_gluten: 'Cereals with gluten',
  crustaceans: 'Crustaceans',
  eggs: 'Eggs',
  fish: 'Fish',
  lupin: 'Lupin',
  milk: 'Milk',
  molluscs: 'Molluscs',
  mustard: 'Mustard',
  nuts: 'Nuts',
  peanuts: 'Peanuts',
  sesame: 'Sesame',
  soya: 'Soya',
  sulphites: 'Sulphites',
};

export function AllergyChecklist({ selected, onChange }: Props) {
  function toggle(code: string, checked: boolean) {
    onChange(checked ? [...selected, code] : selected.filter((x) => x !== code));
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Tap any that apply. We declare on the 14 UK allergens.
      </Typography>
      <FormGroup>
        {UK_FSA_ALLERGENS.map((code) => (
          <FormControlLabel
            key={code}
            control={
              <Checkbox
                size="small"
                checked={selected.includes(code)}
                onChange={(e) => toggle(code, e.target.checked)}
              />
            }
            label={LABELS[code] ?? code.replace(/_/g, ' ')}
            sx={{
              mx: 0,
              borderBottom: 1,
              borderColor: 'divider',
              py: 0.5,
            }}
          />
        ))}
      </FormGroup>
    </Box>
  );
}
