import { DRINK_ARCHETYPE_SLOT_LABELS, type CafeDrinkArchetypeConfig, type DrinkArchetypeDef, type DrinkArchetypeId, type DrinkArchetypeMilkCharge, type DrinkArchetypeSlot } from '@moonshot/domain';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  applyDrinkArchetypeToItems,
  fetchDrinkArchetypes,
  patchDrinkArchetypes,
} from '../../lib/admin-api.js';

const ALL_SLOTS = Object.keys(DRINK_ARCHETYPE_SLOT_LABELS) as DrinkArchetypeSlot[];

type Props = {
  cafeSlug: string;
  token: string;
};

export function DrinkArchetypesPanel({ cafeSlug, token }: Props) {
  const [recipes, setRecipes] = useState<Record<string, DrinkArchetypeDef> | null>(null);
  const [draft, setDraft] = useState<CafeDrinkArchetypeConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDrinkArchetypes(token, cafeSlug)
      .then((data) => {
        setRecipes(data.recipes);
        const next: CafeDrinkArchetypeConfig = {};
        for (const [id, recipe] of Object.entries(data.recipes)) {
          next[id as DrinkArchetypeId] = {
            slots: [...recipe.slots],
            milkCharge: recipe.milkCharge,
          };
        }
        setDraft(next);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load drink types'))
      .finally(() => setLoading(false));
  }, [cafeSlug, token]);

  useEffect(() => {
    load();
  }, [load]);

  function updateRecipe(id: DrinkArchetypeId, patch: Partial<{ slots: DrinkArchetypeSlot[]; milkCharge: DrinkArchetypeMilkCharge }>) {
    setDraft((prev) => {
      const current = prev[id] ?? { slots: [], milkCharge: 'standard' as const };
      const slots = patch.slots ?? current.slots ?? [];
      let milkCharge = patch.milkCharge ?? current.milkCharge ?? 'standard';
      const hasMilk = slots.includes('milk');
      if (!hasMilk) milkCharge = 'none';
      else if (milkCharge === 'none') milkCharge = 'standard';
      return { ...prev, [id]: { slots, milkCharge } };
    });
  }

  function toggleSlot(id: DrinkArchetypeId, slot: DrinkArchetypeSlot) {
    const current = draft[id]?.slots ?? [];
    const has = current.includes(slot);
    const slots = has ? current.filter((s) => s !== slot) : [...current, slot];
    updateRecipe(id, { slots });
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const data = await patchDrinkArchetypes(token, cafeSlug, draft);
      setRecipes(data.recipes);
      setNotice('Drink type recipes saved. Use “Apply to items” to update existing drinks.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onApply(id: DrinkArchetypeId, label: string) {
    setApplyingId(id);
    setError(null);
    try {
      // Persist current draft first so apply uses the latest recipe.
      await patchDrinkArchetypes(token, cafeSlug, draft);
      const result = await applyDrinkArchetypeToItems(token, cafeSlug, id);
      setNotice(`Applied “${label}” to ${result.updatedCount} item${result.updatedCount === 1 ? '' : 's'}.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setApplyingId(null);
    }
  }

  if (loading && !recipes) {
    return <Typography color="text.secondary">Loading drink types…</Typography>;
  }

  const catalogue = recipes
    ? (Object.values(recipes) as DrinkArchetypeDef[])
    : [];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drink types control which modifier sections attach by default. Editing a recipe does not
        change existing items until you apply it. Cafés that never charge for alternative milks can
        set all milk option prices to £0 in the Sections tab.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Stack spacing={2}>
        {catalogue.map((meta) => {
          const id = meta.id;
          const slots = draft[id]?.slots ?? meta.slots;
          const milkCharge = draft[id]?.milkCharge ?? meta.milkCharge;
          const hasMilk = slots.includes('milk');
          return (
            <Box
              key={id}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {meta.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {meta.description}
              </Typography>
              <FormGroup row sx={{ mb: 1 }}>
                {ALL_SLOTS.map((slot) => (
                  <FormControlLabel
                    key={slot}
                    control={
                      <Checkbox
                        size="small"
                        checked={slots.includes(slot)}
                        onChange={() => toggleSlot(id, slot)}
                      />
                    }
                    label={DRINK_ARCHETYPE_SLOT_LABELS[slot]}
                  />
                ))}
              </FormGroup>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }} disabled={!hasMilk}>
                  <InputLabel>Alt-milk charge</InputLabel>
                  <Select
                    label="Alt-milk charge"
                    value={hasMilk ? (milkCharge === 'none' ? 'standard' : milkCharge) : 'none'}
                    onChange={(e) =>
                      updateRecipe(id, {
                        milkCharge: e.target.value as DrinkArchetypeMilkCharge,
                      })
                    }
                  >
                    {!hasMilk && <MenuItem value="none">No milk group</MenuItem>}
                    <MenuItem value="standard">Standard (library prices)</MenuItem>
                    <MenuItem value="waived">Waived on this drink type</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={applyingId === id || saving}
                  onClick={() => void onApply(id, meta.label)}
                >
                  {applyingId === id ? 'Applying…' : 'Apply to items'}
                </Button>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Button
        variant="contained"
        sx={{ mt: 2 }}
        disabled={saving}
        onClick={() => void onSave()}
      >
        {saving ? 'Saving…' : 'Save drink types'}
      </Button>
    </Box>
  );
}
