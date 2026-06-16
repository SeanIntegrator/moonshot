import type {
  NormalisedMenu,
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
} from '@moonshot/types';
import { ArrowBack } from '@mui/icons-material';
import { Box, Button, Container, IconButton, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ModifierOptionGrid } from '../components/ModifierOptionGrid.js';
import { QuantityStepper } from '../components/QuantityStepper.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { apiFetch } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { useCart } from '../providers/CartProvider.js';

function defaultModifiers(item: NormalisedMenuItem): OrderLineModifierSelectionInput[] {
  const out: OrderLineModifierSelectionInput[] = [];
  for (const g of item.modifierGroups) {
    const defaults = g.options.filter((o) => o.isDefault);
    if (g.selectionType === 'single') {
      const pick = defaults[0] ?? g.options[0];
      if (pick) out.push({ groupId: g.id, optionId: pick.id });
    } else {
      for (const d of defaults) {
        out.push({ groupId: g.id, optionId: d.id });
      }
    }
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

function unitPriceMinor(item: NormalisedMenuItem, mods: OrderLineModifierSelectionInput[]): number {
  let total = item.priceMinor;
  for (const sel of mods) {
    const g = item.modifierGroups.find((x) => x.id === sel.groupId);
    const opt = g?.options.find((o) => o.id === sel.optionId);
    if (opt) total += opt.priceMinor;
  }
  return total;
}

export function ItemDetail() {
  const { menuItemId = '' } = useParams();
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { upsertLine } = useCart();
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [modifiers, setModifiers] = useState<OrderLineModifierSelectionInput[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<NormalisedMenu>('/menu');
        setMenu(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load menu');
      }
    })();
  }, []);

  const item = useMemo(() => {
    if (!menu || !menuItemId.trim()) return null;
    return menu.items.find((i) => i.id === menuItemId) ?? null;
  }, [menu, menuItemId]);

  useEffect(() => {
    if (!item) return;
    setModifiers(defaultModifiers(item));
    setQuantity(1);
  }, [item]);

  const lineUnit = item ? unitPriceMinor(item, modifiers) : 0;
  const ready = item ? modifiersAreComplete(item, modifiers) : false;

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

  if (!menu || !item) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
        <Typography color="text.secondary">{menu ? 'Item not found.' : 'Loading…'}</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ pb: 14 }}>
      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            height: 190,
            bgcolor: 'action.hover',
            backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
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
          <Typography variant="body1" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(item.priceMinor, item.currency)}
          </Typography>
        </Box>
        {item.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {item.description}
          </Typography>
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
            upsertLine({ menuItemId: item.id, quantity, modifiers, allergens: [] });
            navigate(cafePath('/order'));
          }}
          sx={{ py: 1.25 }}
        >
          Add · {formatMoney(lineUnit * quantity, item.currency)}
        </Button>
      </Box>
    </Box>
  );
}
