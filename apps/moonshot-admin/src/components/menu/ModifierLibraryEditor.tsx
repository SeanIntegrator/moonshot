import type { CafeModifierGroup, NormalisedModifierOption } from '@moonshot/types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useCallback, useEffect, useState } from 'react';
import {
  createModifierGroup,
  deleteModifierGroup,
  fetchModifierGroups,
  updateModifierGroup,
} from '../../lib/admin-api.js';
import { ColorChipField } from './ColorChipField.js';

function newOption(): NormalisedModifierOption {
  return {
    id: crypto.randomUUID(),
    posOptionId: null,
    name: '',
    priceMinor: 0,
    isDefault: false,
    colorHex: '#e8e8e8',
    chipLabel: '',
  };
}

type Props = {
  cafeSlug: string;
  token: string;
  onLibraryChanged?: () => void;
};

export function ModifierLibraryEditor({ cafeSlug, token, onLibraryChanged }: Props) {
  const [groups, setGroups] = useState<CafeModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchModifierGroups(token, cafeSlug)
      .then((g) => setGroups(g.map((x) => structuredClone(x))))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [cafeSlug, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  function updateGroup(id: string, patch: Partial<CafeModifierGroup>) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function updateOption(groupId: string, optionId: string, patch: Partial<NormalisedModifierOption>) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              options: g.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
            },
      ),
    );
  }

  async function saveGroup(group: CafeModifierGroup) {
    setSavingId(group.id);
    setNotice(null);
    try {
      const updated = await updateModifierGroup(token, cafeSlug, group.id, {
        name: group.name,
        selectionType: group.selectionType,
        required: group.required,
        maxSelect: group.maxSelect,
        options: group.options,
        sortOrder: group.sortOrder,
        slot: group.slot,
      });
      setGroups((prev) => prev.map((g) => (g.id === group.id ? updated : g)));
      setNotice(`Saved “${updated.name}”.`);
      onLibraryChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  async function addGroup() {
    setSavingId('new');
    try {
      const created = await createModifierGroup(token, cafeSlug, {
        name: 'New section',
        selectionType: 'single',
        required: false,
        options: [],
        sortOrder: groups.length,
        slot: 'other',
      });
      setGroups((prev) => [...prev, created]);
      onLibraryChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSavingId(null);
    }
  }

  async function removeGroup(id: string) {
    if (!window.confirm('Remove this section from the library? Attached items will lose it.')) return;
    try {
      await deleteModifierGroup(token, cafeSlug, id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      onLibraryChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) return (
    <Typography sx={{
      color: "text.secondary"
    }}>Loading sections…</Typography>
  );

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 2
        }}>
        Reusable sections (milks, syrups, toppings). Attach them to items on the Items tab. Set KDS colours
        so baristas recognise brands at a glance.
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
      <Stack spacing={1}>
        {groups.map((group) => (
          <Accordion key={group.id} disableGutters>
            <AccordionSummary>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                  width: '100%',
                  pr: 1
                }}>
                <Typography sx={{ flex: 1 }}>{group.name || 'Untitled section'}</Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {group.options.length} options · {group.selectionType}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Section name"
                    size="small"
                    value={group.name}
                    onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                    sx={{ minWidth: 160 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Selection</InputLabel>
                    <Select
                      label="Selection"
                      value={group.selectionType}
                      onChange={(e) =>
                        updateGroup(group.id, {
                          selectionType: e.target.value as 'single' | 'multi',
                        })
                      }
                    >
                      <MenuItem value="single">Single</MenuItem>
                      <MenuItem value="multi">Multi</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={group.required}
                        onChange={(_, v) => updateGroup(group.id, { required: v })}
                      />
                    }
                    label="Required"
                  />
                </Stack>

                <Typography variant="subtitle2" sx={{
                  color: "text.secondary"
                }}>
                  Options (price in pence)
                </Typography>
                {group.options.map((opt) => (
                  <Box key={opt.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{
                      alignItems: "flex-start"
                    }}>
                      <TextField
                        label="Name"
                        size="small"
                        value={opt.name}
                        onChange={(e) => updateOption(group.id, opt.id, { name: e.target.value })}
                      />
                      <TextField
                        label="Price + (p)"
                        type="number"
                        size="small"
                        value={opt.priceMinor}
                        onChange={(e) =>
                          updateOption(group.id, opt.id, {
                            priceMinor: Number(e.target.value) || 0,
                          })
                        }
                        sx={{ width: 110 }}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={opt.isDefault}
                            onChange={(_, v) => {
                              if (group.selectionType === 'single' && v) {
                                setGroups((prev) =>
                                  prev.map((g) =>
                                    g.id !== group.id
                                      ? g
                                      : {
                                          ...g,
                                          options: g.options.map((o) => ({
                                            ...o,
                                            isDefault: o.id === opt.id,
                                          })),
                                        },
                                  ),
                                );
                              } else {
                                updateOption(group.id, opt.id, { isDefault: v });
                              }
                            }}
                          />
                        }
                        label="Default"
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          updateGroup(group.id, {
                            options: group.options.filter((o) => o.id !== opt.id),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </Stack>
                    <Box sx={{ mt: 1 }}>
                      <ColorChipField
                        compact
                        colorHex={opt.colorHex ?? '#e8e8e8'}
                        chipLabel={opt.chipLabel ?? ''}
                        onColorChange={(v) => updateOption(group.id, opt.id, { colorHex: v })}
                        onLabelChange={(v) => updateOption(group.id, opt.id, { chipLabel: v })}
                      />
                    </Box>
                  </Box>
                ))}
                <Button
                  size="small"
                  onClick={() =>
                    updateGroup(group.id, { options: [...group.options, newOption()] })
                  }
                >
                  Add option
                </Button>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={savingId === group.id}
                    onClick={() => void saveGroup(group)}
                  >
                    {savingId === group.id ? 'Saving…' : 'Save section'}
                  </Button>
                  <Button size="small" color="error" onClick={() => void removeGroup(group.id)}>
                    Delete section
                  </Button>
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{ mt: 2 }}
        onClick={() => void addGroup()}
        disabled={savingId === 'new'}
      >
        Add section
      </Button>
    </Box>
  );
}
