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
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.25,
          overflow: 'hidden',
        }}
      >
        <FormGroup sx={{ m: 0 }}>
          {UK_FSA_ALLERGENS.map((code, index) => (
            <FormControlLabel
              key={code}
              control={
                <Checkbox
                  size="small"
                  checked={selected.includes(code)}
                  onChange={(e) => toggle(code, e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {LABELS[code] ?? code.replace(/_/g, ' ')}
                </Typography>
              }
              sx={{
                mx: 0,
                px: 1.5,
                py: 0.75,
                width: '100%',
                borderBottom: index < UK_FSA_ALLERGENS.length - 1 ? 1 : 0,
                borderColor: 'divider',
                '& .MuiFormControlLabel-label': { flex: 1 },
              }}
            />
          ))}
        </FormGroup>
      </Box>
    </Box>
  );
}
