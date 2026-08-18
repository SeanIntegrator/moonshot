import type { CafeModifierGroup, NormalisedModifierOption } from '@moonshot/types';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { ColorChipField } from '../../../components/menu/ColorChipField.js';
import { deleteModifierGroup, updateModifierGroup } from '../../../lib/admin-api.js';
import { formatGbpMinor } from '../../../lib/format.js';
import { FilterChips } from '../../primitives/FilterChips.js';
import { ReadOnlyPanel } from '../../primitives/ReadOnlyPanel.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { STOCK_CHIP_OPTIONS } from '../stock/stock-chips.js';
import { classifyModifierChip } from './modifier-chips.js';

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
  groups: CafeModifierGroup[];
  onLibraryChanged: () => void;
};

export function ModifierListsTab({ cafeSlug, token, groups, onLibraryChanged }: Props) {
  const [drafts, setDrafts] = useState<Record<string, CafeModifierGroup>>({});
  const [chip, setChip] = useState('milk');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tagged = useMemo(
    () => groups.map((g) => ({ group: drafts[g.id] ?? g, chip: classifyModifierChip(g.name) })),
    [groups, drafts],
  );
  const chips = STOCK_CHIP_OPTIONS.filter(
    (opt) => opt.value !== 'food' && tagged.some((t) => t.chip === opt.value),
  );
  const visible = tagged.filter((t) => t.chip === chip).map((t) => t.group);

  function setDraft(group: CafeModifierGroup) {
    setDrafts((prev) => ({ ...prev, [group.id]: group }));
  }

  async function saveGroup(group: CafeModifierGroup) {
    setSavingId(group.id);
    setError(null);
    try {
      const updated = await updateModifierGroup(token, cafeSlug, group.id, {
        name: group.name,
        selectionType: group.selectionType,
        required: group.required,
        maxSelect: group.maxSelect,
        options: group.options,
        sortOrder: group.sortOrder,
      });
      setDraft(updated);
      setNotice(`Saved “${updated.name}”.`);
      onLibraryChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  async function removeGroup(id: string) {
    if (!window.confirm('Remove this section from the library? Attached items will lose it.')) return;
    try {
      await deleteModifierGroup(token, cafeSlug, id);
      onLibraryChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      ) : null}
      <Box sx={{ mb: 2 }}>
        <FilterChips
          value={chips.some((c) => c.value === chip) ? chip : (chips[0]?.value ?? chip)}
          options={chips}
          onChange={setChip}
        />
      </Box>
      <Stack spacing={2}>
        {visible.map((group) => {
          const locked = Boolean(group.posGroupId);
          const original = groups.find((g) => g.id === group.id);
          const dirty = JSON.stringify(group) !== JSON.stringify(original);
          return (
            <SettingsCard
              key={group.id}
              title={group.name || 'Untitled'}
              description={`${group.options.length} options · ${group.selectionType}`}
              save={
                locked
                  ? undefined
                  : {
                      label: savingId === group.id ? 'Saving…' : 'Save list',
                      dirty,
                      valid: group.name.trim().length > 0,
                      saving: savingId === group.id,
                      onSave: () => void saveGroup(group),
                      secondaryLabel: 'Delete',
                      onSecondary: () => void removeGroup(group.id),
                    }
              }
            >
              {locked ? (
                <PosLockedOptions group={group} />
              ) : (
                <EditableOptions group={group} onChange={setDraft} />
              )}
            </SettingsCard>
          );
        })}
      </Stack>
    </Box>
  );
}

function PosLockedOptions({ group }: { group: CafeModifierGroup }) {
  return (
    <ReadOnlyPanel source="square">
      <Stack spacing={1}>
        {group.options.map((opt) => (
          <Typography key={opt.id}>
            {opt.name}
            {opt.priceMinor > 0 ? ` · ${formatGbpMinor(opt.priceMinor)}` : ''}
            {opt.isDefault ? ' · default' : ''}
          </Typography>
        ))}
      </Stack>
    </ReadOnlyPanel>
  );
}

function EditableOptions({
  group,
  onChange,
}: {
  group: CafeModifierGroup;
  onChange: (next: CafeModifierGroup) => void;
}) {
  function updateOption(optionId: string, patch: Partial<NormalisedModifierOption>) {
    onChange({
      ...group,
      options: group.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
    });
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Section name"
          size="small"
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Selection</InputLabel>
          <Select
            label="Selection"
            value={group.selectionType}
            onChange={(e) =>
              onChange({ ...group, selectionType: e.target.value as 'single' | 'multi' })
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
              onChange={(_, v) => onChange({ ...group, required: v })}
            />
          }
          label="Required"
        />
      </Stack>
      {group.options.map((opt) => (
        <Box key={opt.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label="Name"
              size="small"
              value={opt.name}
              onChange={(e) => updateOption(opt.id, { name: e.target.value })}
            />
            <TextField
              label="Price + (p)"
              type="number"
              size="small"
              value={opt.priceMinor}
              onChange={(e) => updateOption(opt.id, { priceMinor: Number(e.target.value) || 0 })}
              sx={{ width: 110 }}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={opt.isDefault}
                  onChange={(_, v) => updateOption(opt.id, { isDefault: v })}
                />
              }
              label="Default"
            />
            <Button
              size="small"
              color="error"
              onClick={() =>
                onChange({ ...group, options: group.options.filter((o) => o.id !== opt.id) })
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
              onColorChange={(v) => updateOption(opt.id, { colorHex: v })}
              onLabelChange={(v) => updateOption(opt.id, { chipLabel: v })}
            />
          </Box>
        </Box>
      ))}
      <Button size="small" onClick={() => onChange({ ...group, options: [...group.options, newOption()] })}>
        Add option
      </Button>
    </Stack>
  );
}
