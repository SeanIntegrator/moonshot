import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { buttonLoader } from '../../console/primitives/button-loader.js';
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

type Phase = 'categories' | 'prices';

/**
 * Guided starter menu — categories + commercially important prices only.
 * Names/descriptions/modifier structure use catalog defaults.
 */
export function MenuTemplateStep({ busy, onBack, onSave }: Props) {
  const [phase, setPhase] = useState<Phase>('categories');
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
    (
      categoryKey: MenuTemplateCategoryState['key'],
      templateKey: string,
      patch: Partial<MenuTemplateDrinkState>,
    ) => {
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
  const canContinue = enabledDrinks > 0 && enabledMilks > 0 && !busy;

  return (
    <Box>
      <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
        {phase === 'categories' ? 'What do you sell?' : 'Set key prices'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        {phase === 'categories'
          ? 'Turn categories on and tick the drinks and milks you offer. We’ll fill in names and kitchen prep.'
          : 'Adjust prices that matter commercially. You can fine-tune everything later in the console.'}
      </Typography>

      {phase === 'categories' ? (
        <Stack spacing={2}>
          {categories.map((cat) => (
            <CategoryPicker
              key={cat.key}
              cat={cat}
              busy={busy}
              onToggleCategory={(enabled) => updateCategory(cat.key, { enabled })}
              onToggleDrink={(key, enabled) => updateDrink(cat.key, key, { enabled })}
              onToggleModifier={(key, enabled) => updateModifier(cat.key, key, { enabled })}
              onDefaultMilk={(key) => updateModifier(cat.key, key, { isDefault: true })}
            />
          ))}
        </Stack>
      ) : (
        <PriceReview
          categories={categories}
          busy={busy}
          onDrinkPrice={(catKey, key, priceMinor) =>
            updateDrink(catKey, key, { priceMinor })
          }
          onModifierPrice={(catKey, key, priceMinor) =>
            updateModifier(catKey, key, { priceMinor })
          }
        />
      )}

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
        {enabledDrinks} drink{enabledDrinks === 1 ? '' : 's'} · {enabledMilks} milk
        {enabledMilks === 1 ? '' : 's'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
        <Button
          variant="outlined"
          onClick={() => (phase === 'prices' ? setPhase('categories') : onBack())}
          disabled={busy}
        >
          Back
        </Button>
        {phase === 'categories' ? (
          <Button
            variant="contained"
            fullWidth
            disabled={!canContinue}
            onClick={() => setPhase('prices')}
          >
            Review prices
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            disabled={!canContinue}
            startIcon={buttonLoader(busy)}
            onClick={() => void onSave(buildMenuTemplateSavePayload(categories))}
          >
            {busy ? 'Saving…' : 'Save menu & continue'}
          </Button>
        )}
      </Box>
    </Box>
  );
}

function CategoryPicker({
  cat,
  busy,
  onToggleCategory,
  onToggleDrink,
  onToggleModifier,
  onDefaultMilk,
}: {
  cat: MenuTemplateCategoryState;
  busy: boolean;
  onToggleCategory: (enabled: boolean) => void;
  onToggleDrink: (key: string, enabled: boolean) => void;
  onToggleModifier: (key: string, enabled: boolean) => void;
  onDefaultMilk: (key: string) => void;
}) {
  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: 1.5,
        p: 1.75,
        opacity: cat.enabled ? 1 : 0.72,
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>{cat.label}</Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={cat.enabled}
              disabled={cat.disableToggle || busy}
              onChange={(_, enabled) => onToggleCategory(enabled)}
            />
          }
          label={cat.enabled ? 'On' : 'Off'}
          sx={{ mr: 0 }}
        />
      </Box>

      {cat.enabled && cat.kind === 'drinks' ? (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column' }}>
          {cat.key === 'food' && cat.drinks.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No food items in the starter set — add them later from the console.
            </Typography>
          ) : null}
          {cat.drinks.map((drink) => (
            <FormControlLabel
              key={drink.templateKey}
              control={
                <Checkbox
                  size="small"
                  checked={drink.enabled}
                  disabled={busy}
                  onChange={(_, enabled) => onToggleDrink(drink.templateKey, enabled)}
                />
              }
              label={drink.name}
            />
          ))}
        </Box>
      ) : null}

      {cat.enabled && cat.kind === 'modifiers' ? (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {cat.modifiers.map((mod) => (
            <Box
              key={mod.templateKey}
              sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={mod.enabled}
                    disabled={busy}
                    onChange={(_, enabled) => onToggleModifier(mod.templateKey, enabled)}
                  />
                }
                label={mod.name}
              />
              {cat.key === 'milks' && mod.enabled ? (
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={mod.isDefault}
                      disabled={busy}
                      onChange={(_, checked) => {
                        if (checked) onDefaultMilk(mod.templateKey);
                      }}
                    />
                  }
                  label={<Typography variant="caption">Default</Typography>}
                />
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function PriceReview({
  categories,
  busy,
  onDrinkPrice,
  onModifierPrice,
}: {
  categories: MenuTemplateCategoryState[];
  busy: boolean;
  onDrinkPrice: (
    catKey: MenuTemplateCategoryState['key'],
    key: string,
    priceMinor: number,
  ) => void;
  onModifierPrice: (
    catKey: MenuTemplateCategoryState['key'],
    key: string,
    priceMinor: number,
  ) => void;
}) {
  const rows = categories.filter((c) => c.enabled);

  return (
    <Stack spacing={2}>
      {rows.map((cat) => {
        const items =
          cat.kind === 'drinks'
            ? cat.drinks.filter((d) => d.enabled)
            : cat.modifiers.filter((m) => m.enabled);
        if (items.length === 0) return null;
        return (
          <Box key={cat.key}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {cat.label}
            </Typography>
            <Stack spacing={1}>
              {cat.kind === 'drinks'
                ? cat.drinks
                    .filter((d) => d.enabled)
                    .map((drink) => (
                      <PriceRow
                        key={drink.templateKey}
                        name={drink.name}
                        priceMinor={drink.priceMinor}
                        busy={busy}
                        onChange={(priceMinor) =>
                          onDrinkPrice(cat.key, drink.templateKey, priceMinor)
                        }
                      />
                    ))
                : cat.modifiers
                    .filter((m) => m.enabled)
                    .map((mod) => (
                      <PriceRow
                        key={mod.templateKey}
                        name={mod.name}
                        priceMinor={mod.priceMinor}
                        busy={busy}
                        label="Extra (£)"
                        onChange={(priceMinor) =>
                          onModifierPrice(cat.key, mod.templateKey, priceMinor)
                        }
                      />
                    ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function PriceRow({
  name,
  priceMinor,
  busy,
  label = 'Price (£)',
  onChange,
}: {
  name: string;
  priceMinor: number;
  busy: boolean;
  label?: string;
  onChange: (priceMinor: number) => void;
}) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1,
        borderBottom: `1px solid ${theme.console.card.border}`,
      })}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatGbpMinor(priceMinor)}
        </Typography>
      </Box>
      <TextField
        label={label}
        type="number"
        size="small"
        value={(priceMinor / 100).toFixed(2)}
        disabled={busy}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value);
          if (Number.isFinite(v) && v >= 0) {
            onChange(Math.round(v * 100));
          }
        }}
        sx={{ width: 120, flexShrink: 0 }}
        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
      />
    </Box>
  );
}
