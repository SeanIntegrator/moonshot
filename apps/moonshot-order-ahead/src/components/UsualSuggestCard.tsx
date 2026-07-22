import type { NormalisedMenu, NormalisedMenuItem, NormalisedOrder } from '@moonshot/types';
import { Box, Button, Typography } from '@mui/material';
import { MenuItemImage } from './MenuItemImage.js';
import { SectionHead } from './SectionHead.js';
import { formatMoney } from '../lib/format.js';
import {
  defaultSelectionsForItem,
  whyNotTryTotalMinor,
} from '../lib/why-not-try.js';

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
    return {
      key: li.id,
      name: li.itemName,
      imageUrl: menuItem?.imageUrl ?? null,
      modifierSummary:
        li.modifiers.length > 0 ? li.modifiers.map((m) => m.optionName).join(' · ') : null,
    };
  });
}

function linesFromWhyNotTry(item: NormalisedMenuItem): LineView[] {
  const { optionNames } = defaultSelectionsForItem(item);
  return [
    {
      key: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      modifierSummary: optionNames.length > 0 ? optionNames.join(' · ') : null,
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
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, p: 1.5 }}>
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
              <Typography variant="body2" fontWeight={600}>
                {li.name}
              </Typography>
              {li.modifierSummary && (
                <Typography variant="caption" color="text.secondary">
                  {li.modifierSummary}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
            <Typography variant="body1" fontWeight={700}>
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
      </Box>
    </Box>
  );
}
