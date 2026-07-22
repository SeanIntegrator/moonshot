import type { NormalisedModifierGroup, OrderLineModifierSelectionInput } from '@moonshot/types';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material';
import { ModifierOptionSlider } from './ModifierOptionSlider.js';

type Props = {
  groups: NormalisedModifierGroup[];
  selections: OrderLineModifierSelectionInput[];
  onSelect: (groupId: string, optionId: string) => void;
};

export function AdditionalCustomisationAccordion({ groups, selections, onSelect }: Props) {
  if (groups.length === 0) return null;

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        mt: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.25,
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="additional-customisation-content"
        id="additional-customisation-header"
        sx={{
          minHeight: 48,
          px: 1.5,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Additional customisation
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 2 }}>
        {groups.map((g) => (
          <ModifierOptionSlider
            key={g.id}
            group={g}
            selections={selections}
            onSelect={onSelect}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
