import type {
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
} from '@moonshot/types';
import { ArrowBack } from '@mui/icons-material';
import { Box, Button, Container, IconButton, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ModifierOptionGrid } from '../components/ModifierOptionGrid.js';
import { QuantityStepper } from '../components/QuantityStepper.js';
import { SizeOptionGrid } from '../components/SizeOptionGrid.js';
import { ItemDetailSkeleton } from '../components/skeletons/PageSkeletons.js';
import { MenuItemImage } from '../components/MenuItemImage.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { formatPriceTag } from '../lib/format.js';
import { defaultSizeId, unitPriceForItem } from '../lib/menu-price-utils.js';
import { useCart } from '../providers/CartProvider.js';
import { useMenu } from '../providers/MenuProvider.js';

function defaultModifiers(item: NormalisedMenuItem): OrderLineModifierSelectionInput[] {
  const out: OrderLineModifierSelectionInput[] = [];
  for (const g of item.modifierGroups) {
    // Multi groups (e.g. syrups) are optional extras — never pre-select a default.
    if (g.selectionType !== 'single') continue;
    const defaults = g.options.filter((o) => o.isDefault);
    const pick = defaults[0] ?? g.options[0];
    if (pick) out.push({ groupId: g.id, optionId: pick.id });
  }
  return out;
}

function modifiersAreComplete(item: NormalisedMenuItem, mods: OrderLineModifierSelectionInput[]): boolean {
  for (const g of item.modifierGroups) {
    const picks = mods.filter((m) => m.groupId === g.id);
    if (g.required && picks.length === 0) return false;
    if (g.selectionType === 'single' && picks.length > 1) return false;
  }
  return true;
}

export function ItemDetail() {
  const { menuItemId = '' } = useParams();
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { upsertLine } = useCart();
  const { menu, loading, error } = useMenu();
  const [quantity, setQuantity] = useState(1);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [modifiers, setModifiers] = useState<OrderLineModifierSelectionInput[]>([]);

  const item = useMemo(() => {
    if (!menu || !menuItemId.trim()) return null;
    return menu.items.find((i) => i.id === menuItemId) ?? null;
  }, [menu, menuItemId]);

  useEffect(() => {
    if (!item) return;
    setModifiers(defaultModifiers(item));
    setSizeId(defaultSizeId(item.sizes ?? []));
    setQuantity(1);
  }, [item]);

  const lineUnit = item ? unitPriceForItem(item, sizeId, modifiers) : 0;
  const hasSizes = (item?.sizes?.length ?? 0) > 0;
  const ready = item
    ? (!hasSizes || sizeId != null) && modifiersAreComplete(item, modifiers)
    : false;

  const headerPrice = item
    ? hasSizes
      ? formatPriceTag(lineUnit, item.currency)
      : formatPriceTag(item.priceMinor, item.currency)
    : '';

  function handleSelect(
    groupId: string,
    optionId: string,
    selectionType: 'single' | 'multi',
    checked: boolean,
  ) {
    setModifiers((prev) => {
      if (selectionType === 'single') {
        return [...prev.filter((m) => m.groupId !== groupId), { groupId, optionId }];
      }
      const rest = prev.filter((m) => !(m.groupId === groupId && m.optionId === optionId));
      return checked ? [...rest, { groupId, optionId }] : rest;
    });
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  if (loading && !menu) {
    return <ItemDetailSkeleton />;
  }

  if (!menu || !item) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 10, minHeight: 200 }}>
        <Typography color="text.secondary">{menu ? 'Item not found.' : 'Loading…'}</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ pb: 14 }}>
      <Box sx={{ position: 'relative' }}>
        <MenuItemImage
          src={item.imageUrl}
          alt={item.name}
          height={220}
          borderRadius={0}
          loading="eager"
          fetchPriority="high"
          objectFit="cover"
        />
        <IconButton
          onClick={() => navigate(cafePath('/order'))}
          aria-label="Back to menu"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
          size="small"
        >
          <ArrowBack fontSize="small" />
        </IconButton>
      </Box>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
          <Typography variant="h5" component="h1" fontWeight={700}>
            {item.name}
          </Typography>
          {headerPrice ? (
            <Typography variant="body1" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {headerPrice}
            </Typography>
          ) : null}
        </Box>
        {item.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {item.description}
          </Typography>
        )}

        {hasSizes && item.sizes && (
          <SizeOptionGrid
            sizes={item.sizes}
            currency={item.currency}
            selectedId={sizeId}
            onSelect={setSizeId}
          />
        )}

        {item.modifierGroups.map((g) => (
          <ModifierOptionGrid
            key={g.id}
            group={g}
            selections={modifiers}
            onSelect={handleSelect}
          />
        ))}
      </Container>

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 600,
          mx: 'auto',
          px: 2,
          py: 1.5,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <Button
          variant="contained"
          fullWidth
          disabled={!ready}
          onClick={() => {
            upsertLine({
              menuItemId: item.id,
              sizeId: hasSizes ? sizeId : null,
              quantity,
              modifiers,
              allergens: [],
            });
            navigate(cafePath('/order'), { state: { addedItemName: item.name } });
          }}
          sx={{
            py: 1.25,
            border: 0,
            boxShadow: 'none',
            backgroundImage: 'none',
            '&::before, &::after': { display: 'none' },
          }}
        >
          Add{formatPriceTag(lineUnit * quantity, item.currency) ? ` · ${formatPriceTag(lineUnit * quantity, item.currency)}` : ''}
        </Button>
      </Box>
    </Box>
  );
}
