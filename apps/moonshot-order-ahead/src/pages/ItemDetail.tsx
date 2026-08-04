import type {
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
} from '@moonshot/types';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdditionalCustomisationAccordion } from '../components/AdditionalCustomisationAccordion.js';
import { ModifierOptionGrid } from '../components/ModifierOptionGrid.js';
import { QuantityStepper } from '../components/QuantityStepper.js';
import { SizeOptionGrid } from '../components/SizeOptionGrid.js';
import { ItemDetailSkeleton } from '../components/skeletons/PageSkeletons.js';
import { MenuItemImage } from '../components/MenuItemImage.js';
import { BackButton, BackButtonIcon } from '../components/ui/BackButton.js';
import { FixedBottomBar } from '../components/ui/FixedBottomBar.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useCafeOpenStatus } from '../hooks/useCafeOpenStatus.js';
import { parseItemDetailLocationState } from '../lib/cart-edit-state.js';
import { formatPriceTag } from '../lib/format.js';
import { partitionModifierGroups } from '../lib/modifier-slider-groups.js';
import { defaultSizeId, unitPriceForItem } from '../lib/menu-price-utils.js';
import { useCart } from '../providers/CartProvider.js';
import { useMenu } from '../providers/MenuProvider.js';
import { PAGE_CONTENT_MAX_WIDTH_PX } from '../theme/pageLayout.js';

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
  const location = useLocation();
  const cafePath = useCafePath();
  const { upsertLine, replaceLine } = useCart();
  const { menu, loading, error } = useMenu();
  const { isOpen } = useCafeOpenStatus();
  const [quantity, setQuantity] = useState(1);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [modifiers, setModifiers] = useState<OrderLineModifierSelectionInput[]>([]);

  const editLine = useMemo(() => {
    const parsed = parseItemDetailLocationState(location.state);
    const line = parsed?.editLine;
    if (!line || !menuItemId.trim()) return null;
    // Ignore stale location.state left over from editing a different item.
    if (line.key !== menuItemId && !line.key.startsWith(`${menuItemId}#`)) return null;
    return line;
  }, [location.state, menuItemId]);

  const item = useMemo(() => {
    if (!menu || !menuItemId.trim()) return null;
    return menu.items.find((i) => i.id === menuItemId) ?? null;
  }, [menu, menuItemId]);

  const isEditing = editLine != null;

  useEffect(() => {
    if (!item) return;
    if (editLine) {
      setModifiers(editLine.modifiers);
      setSizeId(editLine.sizeId);
      setQuantity(editLine.quantity);
      return;
    }
    setModifiers(defaultModifiers(item));
    setSizeId(defaultSizeId(item.sizes ?? []));
    setQuantity(1);
  }, [item, editLine]);

  const lineUnit = item ? unitPriceForItem(item, sizeId, modifiers) : 0;
  const hasSizes = (item?.sizes?.length ?? 0) > 0;
  const { primary: primaryGroups, additional: additionalGroups } = useMemo(
    () => (item ? partitionModifierGroups(item.modifierGroups) : { primary: [], additional: [] }),
    [item],
  );
  const ready = item
    ? (!hasSizes || sizeId != null) && modifiersAreComplete(item, modifiers)
    : false;
  const cafeClosed = !isOpen;
  const canAdd = ready && !cafeClosed;

  const headerPrice = item
    ? hasSizes
      ? formatPriceTag(lineUnit, item.currency)
      : formatPriceTag(item.priceMinor, item.currency)
    : '';

  const priceTag = item ? formatPriceTag(lineUnit * quantity, item.currency) : '';
  const ctaLabel = cafeClosed
    ? 'Cafe is currently closed'
    : isEditing
      ? `Update item${priceTag ? ` · ${priceTag}` : ''}`
      : `Add${priceTag ? ` · ${priceTag}` : ''}`;

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

  function handleBack() {
    navigate(cafePath(isEditing ? '/checkout' : '/order'));
  }

  function handleSubmit() {
    if (cafeClosed || !item) return;
    const params = {
      menuItemId: item.id,
      sizeId: hasSizes ? sizeId : null,
      quantity,
      modifiers,
      allergens: [] as string[],
    };
    if (editLine) {
      replaceLine(editLine.key, params);
      navigate(cafePath('/checkout'));
      return;
    }
    upsertLine(params);
    navigate(cafePath('/order'), { state: { addedItemName: item.name } });
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
    <Box sx={{ pb: '84px' }}>
      <Box
        sx={{
          position: 'relative',
          maxWidth: PAGE_CONTENT_MAX_WIDTH_PX,
          mx: 'auto',
        }}
      >
        <MenuItemImage
          src={item.imageUrl}
          alt={item.name}
          height={{ xs: 220, sm: '25vh' }}
          borderRadius={0}
          loading="eager"
          fetchPriority="high"
          objectFit="cover"
        />
        <BackButton
          onClick={handleBack}
          aria-label={isEditing ? 'Back to checkout' : 'Back to menu'}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper', filter: 'brightness(0.96)' },
          }}
        >
          <BackButtonIcon />
        </BackButton>
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

        {primaryGroups.map((g) => (
          <ModifierOptionGrid
            key={g.id}
            group={g}
            selections={modifiers}
            onSelect={handleSelect}
          />
        ))}

        <AdditionalCustomisationAccordion
          groups={additionalGroups}
          selections={modifiers}
          onSelect={(groupId, optionId) => handleSelect(groupId, optionId, 'single', true)}
        />
      </Container>

      <FixedBottomBar>
        <QuantityStepper value={quantity} onChange={setQuantity} disabled={cafeClosed} />
        <Button
          variant="contained"
          fullWidth
          disabled={!canAdd}
          onClick={handleSubmit}
          sx={{
            py: 1.25,
            border: 0,
            boxShadow: 'none',
            backgroundImage: 'none',
            '&::before, &::after': { display: 'none' },
          }}
        >
          {ctaLabel}
        </Button>
      </FixedBottomBar>
    </Box>
  );
}
