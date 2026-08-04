import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { formatGbpMinor } from '../../lib/format.js';
import {
  buildMenuTemplateSavePayload,
  countEnabledDrinks,
  countEnabledMilks,
  createInitialMenuTemplateState,
  type MenuTemplateCategoryState,
  type MenuTemplateDrinkState,
  type MenuTemplateModifierState,
} from './menu-template.js';

type Props = {
  busy: boolean;
  onBack: () => void;
  onSave: (payload: ReturnType<typeof buildMenuTemplateSavePayload>) => Promise<void>;
};

export function MenuTemplateStep({ busy, onBack, onSave }: Props) {
  const [categories, setCategories] = useState<MenuTemplateCategoryState[]>(() =>
    createInitialMenuTemplateState(),
  );

  const updateCategory = useCallback(
    (key: MenuTemplateCategoryState['key'], patch: Partial<MenuTemplateCategoryState>) => {
      setCategories((prev) =>
        prev.map((cat) => (cat.key === key ? { ...cat, ...patch } : cat)),
      );
    },
    [],
  );

  const updateDrink = useCallback(
    (categoryKey: MenuTemplateCategoryState['key'], templateKey: string, patch: Partial<MenuTemplateDrinkState>) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.key !== categoryKey
            ? cat
            : {
                ...cat,
                drinks: cat.drinks.map((d) =>
                  d.templateKey === templateKey ? { ...d, ...patch } : d,
                ),
              },
        ),
      );
    },
    [],
  );

  const updateModifier = useCallback(
    (
      categoryKey: MenuTemplateCategoryState['key'],
      templateKey: string,
      patch: Partial<MenuTemplateModifierState>,
    ) => {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.key !== categoryKey) return cat;
          const modifiers = cat.modifiers.map((m) => {
            if (m.templateKey !== templateKey) {
              if (patch.isDefault === true) return { ...m, isDefault: false };
              return m;
            }
            return { ...m, ...patch };
          });
          return { ...cat, modifiers };
        }),
      );
    },
    [],
  );

  const enabledDrinks = countEnabledDrinks(categories);
  const enabledMilks = countEnabledMilks(categories);
  const canSave = enabledDrinks > 0 && enabledMilks > 0 && !busy;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Build your starter menu
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          marginBottom: "16px"
        }}>
        Tick the drinks, milks, and syrups you offer. You can edit names, descriptions, and prices
        before saving — add your specialty items from the dashboard later.
      </Typography>

      <Stack spacing={1.5}>
        {categories.map((cat) => (
          <Accordion
            key={cat.key}
            expanded={cat.expanded}
            onChange={(_, expanded) => updateCategory(cat.key, { expanded })}
            disableGutters
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.default',
              '&:before': { display: 'none' },
              opacity: cat.enabled ? 1 : 0.72,
            }}
          >
            <AccordionSummary>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  pr: 1,
                  gap: 2,
                }}
              >
                <Typography sx={{
                  fontWeight: 600
                }}>{cat.label}</Typography>
                <FormControlLabel
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  control={
                    <Switch
                      size="small"
                      checked={cat.enabled}
                      disabled={cat.disableToggle || busy}
                      onChange={(_, enabled) => updateCategory(cat.key, { enabled, expanded: enabled })}
                    />
                  }
                  label={cat.enabled ? 'On' : 'Off'}
                  sx={{ mr: 0 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {cat.kind === 'drinks' && (
                <Stack spacing={2}>
                  {cat.key === 'food' && cat.drinks.length === 0 && (
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      No current food items
                    </Typography>
                  )}
                  {cat.drinks.map((drink) => (
                    <Box
                      key={drink.templateKey}
                      sx={{
                        border: 1,
                        borderColor: drink.enabled && cat.enabled ? 'divider' : 'action.disabled',
                        borderRadius: 1,
                        p: 1.5,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={drink.enabled && cat.enabled}
                            disabled={!cat.enabled || busy}
                            onChange={(_, enabled) => updateDrink(cat.key, drink.templateKey, { enabled })}
                          />
                        }
                        label={
                          <Typography color={cat.enabled ? 'text.primary' : 'text.disabled'} sx={{
                            fontWeight: 600
                          }}>
                            {drink.name}
                          </Typography>
                        }
                      />
                      {drink.enabled && cat.enabled && (
                        <Stack spacing={1.5} sx={{ mt: 1, pl: 4 }}>
                          <TextField
                            label="Item name"
                            size="small"
                            fullWidth
                            value={drink.name}
                            disabled={busy}
                            onChange={(e) => updateDrink(cat.key, drink.templateKey, { name: e.target.value })}
                          />
                          <TextField
                            label="Description"
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            value={drink.description}
                            disabled={busy}
                            onChange={(e) =>
                              updateDrink(cat.key, drink.templateKey, { description: e.target.value })
                            }
                          />
                          <TextField
                            label="Price (£)"
                            type="number"
                            size="small"
                            value={(drink.priceMinor / 100).toFixed(2)}
                            disabled={busy}
                            onChange={(e) => {
                              const v = Number.parseFloat(e.target.value);
                              if (Number.isFinite(v) && v >= 0) {
                                updateDrink(cat.key, drink.templateKey, { priceMinor: Math.round(v * 100) });
                              }
                            }}
                            sx={{ maxWidth: 160 }}
                            slotProps={{
                              htmlInput: { min: 0, step: 0.01 }
                            }}
                          />
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}

              {cat.kind === 'modifiers' && (
                <Stack spacing={1}>
                  {cat.modifiers.map((mod) => (
                    <Box
                      key={mod.templateKey}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.5,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={mod.enabled && cat.enabled}
                            disabled={!cat.enabled || busy}
                            onChange={(_, enabled) =>
                              updateModifier(cat.key, mod.templateKey, { enabled })
                            }
                          />
                        }
                        label={mod.name}
                        sx={{ minWidth: 140 }}
                      />
                      {mod.enabled && cat.enabled && (
                        <>
                          <TextField
                            label="Name"
                            size="small"
                            value={mod.name}
                            disabled={busy}
                            onChange={(e) =>
                              updateModifier(cat.key, mod.templateKey, { name: e.target.value })
                            }
                            sx={{ flex: 1, minWidth: 120 }}
                          />
                          <TextField
                            label="Extra (£)"
                            type="number"
                            size="small"
                            value={(mod.priceMinor / 100).toFixed(2)}
                            disabled={busy}
                            onChange={(e) => {
                              const v = Number.parseFloat(e.target.value);
                              if (Number.isFinite(v) && v >= 0) {
                                updateModifier(cat.key, mod.templateKey, {
                                  priceMinor: Math.round(v * 100),
                                });
                              }
                            }}
                            sx={{ width: 110 }}
                            slotProps={{
                              htmlInput: { min: 0, step: 0.01 }
                            }}
                          />
                          {cat.key === 'milks' && (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  size="small"
                                  checked={mod.isDefault}
                                  disabled={busy}
                                  onChange={(_, isDefault) =>
                                    updateModifier(cat.key, mod.templateKey, { isDefault })
                                  }
                                />
                              }
                              label="Default"
                            />
                          )}
                          <Typography variant="caption" sx={{
                            color: "text.secondary"
                          }}>
                            {formatGbpMinor(mod.priceMinor)}
                          </Typography>
                        </>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "block",
          mt: 2
        }}>
        {enabledDrinks} drink{enabledDrinks === 1 ? '' : 's'} selected · {enabledMilks} milk
        {enabledMilks === 1 ? '' : 's'} selected
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button variant="outlined" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button
          variant="contained"
          fullWidth
          disabled={!canSave}
          onClick={() => void onSave(buildMenuTemplateSavePayload(categories))}
        >
          {busy ? <CircularProgress size={22} /> : 'Save menu & continue'}
        </Button>
      </Box>
    </Box>
  );
}
