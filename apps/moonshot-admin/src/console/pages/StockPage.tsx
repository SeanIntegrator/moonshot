import { Box, Typography } from '@mui/material';
import type { AdminStockResponse, StockChipKey } from '@moonshot/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { fetchAdminStock, patchMenuItem, putAdminStockOption } from '../../lib/admin-api.js';
import { FilterChips } from '../primitives/FilterChips.js';
import { PageHeader } from '../primitives/PageHeader.js';
import { SettingsCard } from '../primitives/SettingsCard.js';
import { StockControl, type StockAvailability } from '../primitives/StockControl.js';
import { useToast } from '../primitives/ToastProvider.js';
import { StockPageSkeleton } from '../primitives/skeletons/StockPageSkeleton.js';
import { STOCK_CHIP_OPTIONS } from './stock/stock-chips.js';
import { StockChipIcon } from './stock/StockChipIcon.js';
import { StockOptionRow, StockRowList } from './stock/StockOptionRow.js';
import {
  foodStockMeta,
  groupStockOptions,
  optionStockMeta,
  usedOnLabel,
} from './stock/stock-meta.js';

export function StockPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [stock, setStock] = useState<AdminStockResponse | null>(null);
  const [chip, setChip] = useState<StockChipKey>('milk');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = session?.token;
  const cafeSlug = session?.cafe.slug;

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetchAdminStock(token)
      .then(setStock)
      .catch((e) =>
        toast({ severity: 'error', message: e instanceof Error ? e.message : 'Failed to load stock' }),
      )
      .finally(() => setLoading(false));
  }, [token, toast]);

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

  const optionRows = stock && chip !== 'food' ? stock.options.filter((row) => row.chip === chip) : [];
  const foodRows = stock && chip === 'food' ? stock.food : [];
  const groups = groupStockOptions(optionRows);

  async function onOptionChange(optionId: string, availability: StockAvailability) {
    if (!token) return;
    setBusyId(optionId);
    try {
      setStock(await putAdminStockOption(token, optionId, availability));
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Could not update stock' });
    } finally {
      setBusyId(null);
    }
  }

  async function onFoodChange(itemId: string, availability: 'in' | 'out') {
    if (!token || !cafeSlug) return;
    setBusyId(itemId);
    try {
      await patchMenuItem(token, cafeSlug, itemId, { isAvailable: availability === 'in' });
      setStock(await fetchAdminStock(token));
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Could not update food' });
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
      {loading && !stock ? <StockPageSkeleton /> : null}
      {stock ? (
        <>
          <SettingsCard
            title="What's on"
            description={
              stock.drinksAffectedCount > 0
                ? `${stock.drinksAffectedCount} drink${stock.drinksAffectedCount === 1 ? '' : 's'} affected right now.`
                : 'Out today comes back when you next open.'
            }
          >
            <Box sx={{ mb: chip === 'food' && foodRows.length > 0 ? 1 : 0 }}>
              <FilterChips
                value={chip}
                options={visibleChips}
                onChange={(next) => setChip(next as StockChipKey)}
              />
            </Box>
            {chip === 'food' && foodRows.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 2 }}>
                No food items yet.
              </Typography>
            ) : null}
            {chip !== 'food' && optionRows.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Nothing in this list.
              </Typography>
            ) : null}
            {chip === 'food' && foodRows.length > 0 ? (
              <StockRowList>
                {foodRows.map((row) => (
                  <StockOptionRow
                    key={row.itemId}
                    name={row.name}
                    meta={foodStockMeta(row.availability)}
                    availability={row.availability}
                    badge={<StockChipIcon chip="food" />}
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
                ))}
              </StockRowList>
            ) : null}
          </SettingsCard>
          {chip !== 'food'
            ? groups.map((group) => (
                <SettingsCard
                  key={group.groupId}
                  title={group.groupName}
                  headerAction={
                    <Typography variant="body2">{usedOnLabel(group.usedOnCount)}</Typography>
                  }
                >
                  <StockRowList>
                    {group.options.map((row) => (
                      <StockOptionRow
                        key={row.optionId}
                        name={row.name}
                        meta={optionStockMeta(row.availability, row.usedOnCount)}
                        availability={row.availability}
                        badge={<StockChipIcon chip={row.chip} />}
                        control={
                          <StockControl
                            value={row.availability}
                            disabled={busyId === row.optionId}
                            onChange={(next) => void onOptionChange(row.optionId, next)}
                          />
                        }
                      />
                    ))}
                  </StockRowList>
                </SettingsCard>
              ))
            : null}
        </>
      ) : null}
    </Box>
  );
}
