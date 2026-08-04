import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { NormalisedOrder } from '@moonshot/types';
import { Box, Fade, IconButton, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { RecentOrderCard } from './RecentOrderCard.js';
import { SectionHead } from './SectionHead.js';

export const RECENT_ORDERS_PAGE_SIZE = 3;

type Props = {
  orders: NormalisedOrder[];
  orderingAvailable: boolean;
  onReorder: (order: NormalisedOrder) => void;
};

export function RecentOrdersSection({ orders, orderingAvailable, onReorder }: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(orders.length / RECENT_ORDERS_PAGE_SIZE));

  // Keep the window valid when the list shrinks (e.g. after a refresh).
  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount - 1));
  }, [pageCount]);

  const pageOrders = useMemo(() => {
    const start = page * RECENT_ORDERS_PAGE_SIZE;
    return orders.slice(start, start + RECENT_ORDERS_PAGE_SIZE);
  }, [orders, page]);

  if (orders.length === 0) return null;

  const rangeStart = page * RECENT_ORDERS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(orders.length, (page + 1) * RECENT_ORDERS_PAGE_SIZE);
  const showPager = orders.length > RECENT_ORDERS_PAGE_SIZE;

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHead
        eyebrow="Activity"
        title="Recent orders"
        action={
          showPager ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontVariantNumeric: 'tabular-nums',
                  mr: 0.5
                }}>
                {rangeStart}–{rangeEnd} of {orders.length}
              </Typography>
              <IconButton
                size="small"
                aria-label="Previous orders"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Next orders"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : undefined
        }
      />
      <Fade in key={page} timeout={180}>
        <Box>
          {pageOrders.map((o) => (
            <RecentOrderCard
              key={o.id}
              order={o}
              orderingAvailable={orderingAvailable}
              onReorder={onReorder}
            />
          ))}
        </Box>
      </Fade>
    </Box>
  );
}
