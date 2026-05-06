import type { NormalisedMenuItem } from '@moonshot/types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { fetchMenuForCafe, patchMenuItem } from '../lib/admin-api.js';
import { formatGbpMinor } from '../lib/format.js';

type Props = {
  cafeSlug: string;
  token: string;
};

export function MenuEditorCard({ cafeSlug, token }: Props) {
  const [items, setItems] = useState<NormalisedMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchMenuForCafe(cafeSlug)
      .then((m) => setItems(m.items.map((i) => structuredClone(i))))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load menu'))
      .finally(() => setLoading(false));
  }, [cafeSlug]);

  useEffect(() => {
    reload();
  }, [reload]);

  function updateItem(id: string, next: NormalisedMenuItem) {
    setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
  }

  function setOptionPrice(itemId: string, groupId: string, optionId: string, priceMinor: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const modifierGroups = i.modifierGroups.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                options: g.options.map((o) => (o.id === optionId ? { ...o, priceMinor } : o)),
              },
        );
        return { ...i, modifierGroups };
      }),
    );
  }

  async function saveItem(item: NormalisedMenuItem) {
    setSavingId(item.id);
    setNotice(null);
    try {
      const updated = await patchMenuItem(token, cafeSlug, item.id, {
        priceMinor: item.priceMinor,
        isAvailable: item.isAvailable,
        modifierGroups: item.modifierGroups,
      });
      updateItem(item.id, updated);
      setNotice({ type: 'ok', text: `Saved “${updated.name}”.` });
    } catch (e) {
      setNotice({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Paper>
    );
  }

  if (loadError) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{loadError}</Alert>
        <Box sx={{ mt: 2 }}>
          <Button onClick={() => reload()}>Retry</Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Menu & pricing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Items shown on the order-ahead app. Toggle availability, adjust base price and modifier option prices
        (milk, customisations).
      </Typography>
      {notice && (
        <Alert severity={notice.type === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}
      <Stack spacing={1}>
        {items.map((item) => (
          <Accordion key={item.id} disableGutters>
            <AccordionSummary>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 1 }}>
                <Typography sx={{ flex: 1 }}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatGbpMinor(item.priceMinor, item.currency)}
                </Typography>
                <Typography variant="caption" color={item.isAvailable ? 'success.main' : 'text.disabled'}>
                  {item.isAvailable ? 'On menu' : 'Hidden'}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  <TextField
                    label={`Base price (${item.currency})`}
                    type="number"
                    size="small"
                    value={item.priceMinor / 100}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (!Number.isFinite(v)) return;
                      updateItem(item.id, { ...item, priceMinor: Math.round(v * 100) });
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText={`Currently ${formatGbpMinor(item.priceMinor, item.currency)} — edit in main currency units`}
                    sx={{ minWidth: 200 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={item.isAvailable}
                        onChange={(_, v) => updateItem(item.id, { ...item, isAvailable: v })}
                      />
                    }
                    label="Orderable on app"
                  />
                </Stack>
                {item.modifierGroups.some((g) => g.options.length > 0) && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Modifiers & options (minor units / pence)
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Group</TableCell>
                          <TableCell>Option</TableCell>
                          <TableCell align="right">Price + (pence)</TableCell>
                          <TableCell align="right">Preview</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {item.modifierGroups.flatMap((g) =>
                          g.options.map((o) => (
                            <TableRow key={`${g.id}-${o.id}`}>
                              <TableCell>{g.name}</TableCell>
                              <TableCell>{o.name}</TableCell>
                              <TableCell align="right" sx={{ maxWidth: 140 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={o.priceMinor}
                                  onChange={(e) =>
                                    setOptionPrice(item.id, g.id, o.id, Number(e.target.value) || 0)
                                  }
                                  inputProps={{ min: 0, step: 1 }}
                                />
                              </TableCell>
                              <TableCell align="right">{formatGbpMinor(o.priceMinor, item.currency)}</TableCell>
                            </TableRow>
                          )),
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                )}
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => void saveItem(item)}
                  disabled={savingId === item.id}
                >
                  {savingId === item.id ? 'Saving…' : 'Save item'}
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Paper>
  );
}
