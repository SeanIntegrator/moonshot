import type { CafeMenuSection, NormalisedMenuItem } from '@moonshot/types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ReactNode } from 'react';
import { formatGbpMinor } from '../../lib/format.js';

type DraftItem = NormalisedMenuItem & { attachedGroupIds: string[] };

type Props = {
  section: CafeMenuSection;
  items: NormalisedMenuItem[];
  sectionBusyId: string | null;
  togglingId: string | null;
  draftFor: (item: NormalisedMenuItem) => DraftItem;
  onToggleSection: (section: CafeMenuSection, enabled: boolean) => void;
  onToggleAvailability: (item: NormalisedMenuItem, next: boolean) => void;
  renderEditor: (draft: DraftItem, itemId: string) => ReactNode;
};

/** One café menu section header + item accordions (or Food empty copy). */
export function MenuSectionBlock({
  section,
  items,
  sectionBusyId,
  togglingId,
  draftFor,
  onToggleSection,
  onToggleAvailability,
  renderEditor,
}: Props) {
  const showEmptyFood = (section.kind === 'food' || section.key === 'food') && items.length === 0;

  return (
    <Stack spacing={1} sx={{ mb: 3, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: "text.secondary",
            flex: 1
          }}>
          {section.label}
          {section.parentKey ? '' : ''}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={section.enabled}
              disabled={sectionBusyId === section.id}
              onChange={(_, v) => onToggleSection(section, v)}
            />
          }
          label={section.enabled ? 'On' : 'Off'}
          sx={{ mr: 0 }}
        />
      </Stack>

      {showEmptyFood ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            pl: 0.5
          }}>
          No current food items
        </Typography>
      ) : (
        items.map((item) => {
          const draft = draftFor(item);
          const displayPrice =
            draft.sizes.length > 0
              ? `from ${formatGbpMinor(Math.min(...draft.sizes.map((s) => s.priceMinor)), draft.currency)}`
              : formatGbpMinor(draft.priceMinor, draft.currency);
          return (
            <Accordion key={item.id} disableGutters sx={{ minWidth: 0 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minWidth: 0,
                  '& .MuiAccordionSummary-content': { minWidth: 0, overflow: 'hidden' },
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                    width: '100%',
                    minWidth: 0
                  }}>
                  <Typography
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      flexShrink: 0
                    }}>
                    {displayPrice}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      alignItems: "center",
                      flexShrink: 0
                    }}>
                    <Switch
                      size="small"
                      checked={item.isAvailable}
                      disabled={togglingId === item.id}
                      onChange={(_, v) => onToggleAvailability(item, v)}
                    />
                    <Typography
                      variant="caption"
                      color={item.isAvailable ? 'success.main' : 'text.disabled'}
                    >
                      {item.isAvailable ? 'On menu' : 'Hidden'}
                    </Typography>
                  </Stack>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>{renderEditor(draft, item.id)}</AccordionDetails>
            </Accordion>
          );
        })
      )}
    </Stack>
  );
}
