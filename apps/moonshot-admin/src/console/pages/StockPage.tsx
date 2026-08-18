import { Alert, Box, Typography } from '@mui/material';
import type { AdminStockFoodRow, AdminStockOptionRow, AdminStockResponse, StockChipKey } from '@moonshot/types';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { fetchAdminStock, patchMenuItem, putAdminStockOption } from '../../lib/admin-api.js';
import { FilterChips } from '../primitives/FilterChips.js';
import { PageHeader } from '../primitives/PageHeader.js';
import { SettingsCard } from '../primitives/SettingsCard.js';
import { StockControl, type StockAvailability } from '../primitives/StockControl.js';
import { STOCK_CHIP_OPTIONS } from './stock/stock-chips.js';

function usedOnLabel(count: number): string {
  if (count === 1) return 'on 1 drink';
  return `on ${count} drinks`;
}

export function StockPage() {
  const { session } = useAuth();
  const [stock, setStock] = useState<AdminStockResponse | null>(null);
  const [chip, setChip] = useState<StockChipKey>('milk');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = session?.token;
  const cafeSlug = session?.cafe.slug;

  const load = useCallback(() => {
    if (!token) return;
    setError(null);
    setLoading(true);
    fetchAdminStock(token)
      .then(setStock)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stock'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleChips = useMemo(() => {
    if (!stock) return STOCK_CHIP_OPTIONS;
    return STOCK_CHIP_OPTIONS.filter((opt) => {
      if (opt.value === 'food') return stock.food.length > 0;
      return stock.options.some((row) => row.chip === opt.value);
    });
  }, [stock]);

  useEffect(() => {
    if (visibleChips.length === 0) return;
    if (!visibleChips.some((c) => c.value === chip)) {
      setChip(visibleChips[0]!.value);
    }
  }, [visibleChips, chip]);

  const optionRows: AdminStockOptionRow[] =
    stock && chip !== 'food' ? stock.options.filter((row) => row.chip === chip) : [];
  const foodRows: AdminStockFoodRow[] = stock && chip === 'food' ? stock.food : [];

  async function onOptionChange(optionId: string, availability: StockAvailability) {
    if (!token) return;
    setBusyId(optionId);
    setError(null);
    try {
      setStock(await putAdminStockOption(token, optionId, availability));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update stock');
    } finally {
      setBusyId(null);
    }
  }

  async function onFoodChange(itemId: string, availability: 'in' | 'out') {
    if (!token || !cafeSlug) return;
    setBusyId(itemId);
    setError(null);
    try {
      await patchMenuItem(token, cafeSlug, itemId, { isAvailable: availability === 'in' });
      setStock(await fetchAdminStock(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update food');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Stock"
        description="Turning items off greys them out for customers immediately."
      />
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <SettingsCard
        title="What's on"
        description={
          stock && stock.drinksAffectedCount > 0
            ? `${stock.drinksAffectedCount} drink${stock.drinksAffectedCount === 1 ? '' : 's'} affected right now.`
            : 'Out today comes back when you next open.'
        }
      >
        <Box sx={{ mb: 2 }}>
          <FilterChips
            value={chip}
            options={visibleChips}
            onChange={(next) => setChip(next as StockChipKey)}
          />
        </Box>
        {loading && !stock ? (
          <Typography variant="body2">Loading…</Typography>
        ) : chip === 'food' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {foodRows.length === 0 ? (
              <Typography variant="body2">No food items yet.</Typography>
            ) : (
              foodRows.map((row) => (
                <StockRow
                  key={row.itemId}
                  name={row.name}
                  meta={row.availability === 'out' ? 'Off the menu' : 'On the menu'}
                  control={
                    <StockControl
                      value={row.availability}
                      states={['in', 'out']}
                      disabled={busyId === row.itemId}
                      onChange={(next) => {
                        if (next === 'in' || next === 'out') void onFoodChange(row.itemId, next);
                      }}
                    />
                  }
                />
              ))
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {optionRows.length === 0 ? (
              <Typography variant="body2">Nothing in this list.</Typography>
            ) : (
              optionRows.map((row) => (
                <StockRow
                  key={row.optionId}
                  name={row.name}
                  meta={usedOnLabel(row.usedOnCount)}
                  control={
                    <StockControl
                      value={row.availability}
                      disabled={busyId === row.optionId}
                      onChange={(next) => void onOptionChange(row.optionId, next)}
                    />
                  }
                />
              ))
            )}
          </Box>
        )}
      </SettingsCard>
    </Box>
  );
}

function StockRow({
  name,
  meta,
  control,
}: {
  name: string;
  meta: string;
  control: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.25,
      }}
    >
      <Box sx={{ minWidth: 0, flex: '1 1 140px' }}>
        <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
        <Typography variant="body2">{meta}</Typography>
      </Box>
      <Box sx={{ flex: '0 0 auto' }}>{control}</Box>
    </Box>
  );
}
