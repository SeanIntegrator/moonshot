import type {
  NormalisedMenu,
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
} from '@moonshot/types';
import { UK_FSA_ALLERGENS } from '@moonshot/types';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
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

function replaceSingleGroup(
  mods: OrderLineModifierSelectionInput[],
  groupId: string,
  optionId: string,
): OrderLineModifierSelectionInput[] {
  return [...mods.filter((m) => m.groupId !== groupId), { groupId, optionId }];
}

function toggleMultiOption(
  mods: OrderLineModifierSelectionInput[],
  groupId: string,
  optionId: string,
  checked: boolean,
): OrderLineModifierSelectionInput[] {
  const rest = mods.filter((m) => !(m.groupId === groupId && m.optionId === optionId));
  if (!checked) return rest;
  return [...rest, { groupId, optionId }];
}

export function ItemDetail() {
  const { menuItemId = '' } = useParams();
  const navigate = useNavigate();
  const { upsertLine } = useCart();
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [modifiers, setModifiers] = useState<OrderLineModifierSelectionInput[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);

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
    setAllergens([]);
    setQuantity(1);
  }, [item]);

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
        <Typography color="error">{error}</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Back
        </Button>
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

  const ready = modifiersAreComplete(item, modifiers);

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
      <Button size="small" onClick={() => navigate('/order')} sx={{ mb: 1 }}>
        ← Menu
      </Button>
      <Typography variant="h5" component="h1" fontWeight={700}>
        {item.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        £{(item.priceMinor / 100).toFixed(2)} · {item.category.replace(/_/g, ' ')}
      </Typography>
      {item.description && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {item.description}
        </Typography>
      )}

      <TextField
        label="Quantity"
        type="number"
        size="small"
        sx={{ mt: 2, width: 120 }}
        inputProps={{ min: 1, step: 1 }}
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
      />

      {item.modifierGroups.map((g) => (
        <Box key={g.id} sx={{ mt: 3 }}>
          <FormControl component="fieldset" variant="standard" fullWidth>
            <FormLabel component="legend">
              {g.name}
              {g.required ? ' *' : ''}
            </FormLabel>
            {g.selectionType === 'single' ? (
              <RadioGroup
                value={modifiers.find((m) => m.groupId === g.id)?.optionId ?? ''}
                onChange={(_, v) => setModifiers((prev) => replaceSingleGroup(prev, g.id, v))}
              >
                {g.options.map((o) => (
                  <FormControlLabel
                    key={o.id}
                    value={o.id}
                    control={<Radio size="small" />}
                    label={`${o.name}${o.priceMinor ? ` (+£${(o.priceMinor / 100).toFixed(2)})` : ''}`}
                  />
                ))}
              </RadioGroup>
            ) : (
              <FormGroup>
                {g.options.map((o) => {
                  const checked = modifiers.some((m) => m.groupId === g.id && m.optionId === o.id);
                  return (
                    <FormControlLabel
                      key={o.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={checked}
                          onChange={(e) =>
                            setModifiers((prev) =>
                              toggleMultiOption(prev, g.id, o.id, e.target.checked),
                            )
                          }
                        />
                      }
                      label={`${o.name}${o.priceMinor ? ` (+£${(o.priceMinor / 100).toFixed(2)})` : ''}`}
                    />
                  );
                })}
              </FormGroup>
            )}
          </FormControl>
          <Divider sx={{ mt: 2 }} />
        </Box>
      ))}

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
        Allergens you want flagged on this drink (UK FSA codes)
      </Typography>
      <FormGroup>
        {UK_FSA_ALLERGENS.map((code) => (
          <Fragment key={code}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={allergens.includes(code)}
                  onChange={(e) =>
                    setAllergens((prev) =>
                      e.target.checked ? [...prev, code] : prev.filter((x) => x !== code),
                    )
                  }
                />
              }
              label={code.replace(/_/g, ' ')}
            />
          </Fragment>
        ))}
      </FormGroup>

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 3 }}
        disabled={!ready}
        onClick={() => {
          upsertLine({
            menuItemId: item.id,
            quantity,
            modifiers,
            allergens,
          });
          navigate('/order');
        }}
      >
        Add to basket
      </Button>
    </Container>
  );
}
