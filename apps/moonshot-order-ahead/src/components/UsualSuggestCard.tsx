import type { NormalisedMenu, NormalisedMenuItem, NormalisedOrder } from '@moonshot/types';
import { Box, Button, Typography } from '@mui/material';
import { MenuItemImage } from './MenuItemImage.js';
import { SectionHead } from './SectionHead.js';
import { SurfaceCard } from './ui/SurfaceCard.js';
import { formatMoney, modifierSummary } from '../lib/format.js';
import { isStandardModifierVariant } from '../lib/modifier-display.js';
import { whyNotTryTotalMinor } from '../lib/why-not-try.js';

type LineView = {
  key: string;
  name: string;
  imageUrl: string | null;
  modifierSummary: string | null;
};

type UsualProps = {
  variant: 'usual';
  order: NormalisedOrder;
  menu: NormalisedMenu | null;
  orderingAvailable: boolean;
  onOrder: () => void;
};

type WhyNotTryProps = {
  variant: 'whyNotTry';
  item: NormalisedMenuItem;
  orderingAvailable: boolean;
  onOrder: () => void;
};

type Props = UsualProps | WhyNotTryProps;

function linesFromUsual(order: NormalisedOrder, menu: NormalisedMenu | null): LineView[] {
  return order.items.map((li) => {
    const menuItem = li.menuItemId
      ? menu?.items?.find((i) => i.id === li.menuItemId)
      : undefined;
    const custom = li.modifiers.filter((m) => !isStandardModifierVariant(m, menuItem));
    const summary = modifierSummary(custom);
    return {
      key: li.id,
      name: li.itemName,
      imageUrl: menuItem?.imageUrl ?? null,
      // Only non-standard customisations — Whole milk / Regular / Double etc. stay hidden.
      modifierSummary: summary || null,
    };
  });
}

function linesFromWhyNotTry(item: NormalisedMenuItem): LineView[] {
  // Suggestion uses menu defaults only — nothing non-standard to surface.
  return [
    {
      key: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      modifierSummary: null,
    },
  ];
}

/** Shared home card for “Your usual” reorder and “Why not try” suggestion. */
export function UsualSuggestCard(props: Props) {
  const { variant, orderingAvailable, onOrder } = props;
  const title = variant === 'usual' ? 'Your usual' : 'Why not try';
  const lines =
    variant === 'usual'
      ? linesFromUsual(props.order, props.menu)
      : linesFromWhyNotTry(props.item);
  const totalMinor =
    variant === 'usual' ? props.order.totalMinor : whyNotTryTotalMinor(props.item);
  const currency = variant === 'usual' ? props.order.currency : props.item.currency;

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHead title={title} />
      <SurfaceCard sx={{ p: 1.5 }}>
        {lines.map((li) => (
          <Box key={li.key} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.25 }}>
            <MenuItemImage
              src={li.imageUrl}
              alt={li.name}
              width={48}
              height={48}
              borderRadius={1}
              loading="lazy"
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{
                fontWeight: 600
              }}>
                {li.name}
              </Typography>
              {li.modifierSummary && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {li.modifierSummary}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          <Box>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Total
            </Typography>
            <Typography variant="body1" sx={{
              fontWeight: 700
            }}>
              {formatMoney(totalMinor, currency)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={!orderingAvailable}
            onClick={() => {
              if (!orderingAvailable) return;
              onOrder();
            }}
            sx={{ minWidth: 140 }}
          >
            Order →
          </Button>
        </Box>
      </SurfaceCard>
    </Box>
  );
}
