import type { MenuCategory, PickupEstimateResponse } from '@moonshot/types';
import { Alert, Box, Container, Snackbar, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CategoryStrip } from '../components/CategoryStrip.js';
import { FloatingCartBar } from '../components/FloatingCartBar.js';
import { MenuItemCard } from '../components/MenuItemCard.js';
import { PickupTimeChip } from '../components/PickupTimeChip.js';
import { MenuPageSkeleton } from '../components/skeletons/PageSkeletons.js';
import { groupMenuByCategory } from '../lib/menu-utils.js';
import { useCart } from '../providers/CartProvider.js';
import { useMenu } from '../providers/MenuProvider.js';
import { fetchPickupEstimate } from '../api/orders-api.js';
import { unitPriceForItem } from '../lib/menu-price-utils.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { useCafePath } from '../hooks/useCafePath.js';

function simpleLineQty(lines: ReturnType<typeof useCart>['lines'], menuItemId: string): number {
  const hit = lines.find(
    (l) => l.menuItemId === menuItemId && l.modifiers.length === 0 && !l.sizeId,
  );
  return hit?.quantity ?? 0;
}

function totalCartQty(lines: ReturnType<typeof useCart>['lines']): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

type MenuLocationState = {
  addedItemName?: string;
};

export function Menu() {
  const navigate = useNavigate();
  const location = useLocation();
  const cafePath = useCafePath();
  const { orderAheadEnabled, pickupTimeEnabled, maxPickupMinutes } = useCafeFeatures();
  const locationState = location.state as MenuLocationState | null;
  const { menu, loading, error } = useMenu();
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('hot_drinks');
  const [estimate, setEstimate] = useState<PickupEstimateResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { lines, pickupDelayMinutes, setPickupDelayMinutes } = useCart();
  const sectionRefs = useRef<Partial<Record<MenuCategory, HTMLDivElement | null>>>({});
  const categoryInitialized = useRef(false);

  useEffect(() => {
    if (!orderAheadEnabled) {
      navigate(cafePath('/'), { replace: true });
    }
  }, [orderAheadEnabled, navigate, cafePath]);

  useEffect(() => {
    if (!locationState?.addedItemName) return;
    setToastMessage(`${locationState.addedItemName} added to basket`);
    navigate('.', { replace: true, state: null });
  }, [locationState?.addedItemName, navigate]);

  useEffect(() => {
    if (!menu || categoryInitialized.current) return;
    const sections = groupMenuByCategory(menu);
    if (sections[0]) {
      setActiveCategory(sections[0].category);
      categoryInitialized.current = true;
    }
  }, [menu]);

  useEffect(() => {
    void (async () => {
      try {
        const est = await fetchPickupEstimate();
        setEstimate(est);
      } catch {
        setEstimate(null);
      }
    })();
  }, []);

  const sections = useMemo(() => (menu ? groupMenuByCategory(menu) : []), [menu]);

  const cartTotalMinor = useMemo(() => {
    if (!menu) return 0;
    return lines.reduce((sum, line) => {
      const item = menu.items.find((i) => i.id === line.menuItemId);
      if (!item) return sum;
      let delta = 0;
      for (const sel of line.modifiers) {
        const g = item.modifierGroups.find((x) => x.id === sel.groupId);
        const opt = g?.options.find((o) => o.id === sel.optionId);
        if (opt) delta += opt.priceMinor;
      }
      const unit = unitPriceForItem(item, line.sizeId, delta);
      return sum + unit * line.quantity;
    }, 0);
  }, [menu, lines]);

  function scrollToCategory(cat: MenuCategory) {
    setActiveCategory(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading && !menu) {
    return <MenuPageSkeleton />;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 14 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ mt: 0 }}>
          Order
        </Typography>
        {pickupTimeEnabled && (
          <PickupTimeChip
            estimate={estimate}
            value={pickupDelayMinutes}
            onChange={setPickupDelayMinutes}
            maxPickupMinutes={maxPickupMinutes}
          />
        )}
      </Box>

      {sections.length > 0 && (
        <CategoryStrip sections={sections} active={activeCategory} onSelect={scrollToCategory} />
      )}

      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      {sections.map((section) => (
        <Box
          key={section.category}
          ref={(el: HTMLDivElement | null) => {
            sectionRefs.current[section.category] = el;
          }}
          sx={{ mb: 3, scrollMarginTop: 8 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {section.label} · {section.items.length} items
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.25,
              mt: 1,
            }}
          >
            {section.items.map((item) => (
              <MenuItemCard key={item.id} item={item} qty={simpleLineQty(lines, item.id)} />
            ))}
          </Box>
        </Box>
      ))}

      <FloatingCartBar
        itemCount={totalCartQty(lines)}
        totalMinor={cartTotalMinor}
        currency={menu?.items[0]?.currency}
      />

      <Snackbar
        open={toastMessage != null}
        autoHideDuration={2500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: totalCartQty(lines) > 0 ? 112 : 72,
          width: '100%',
          maxWidth: 600,
          px: 2,
        }}
      >
        <Alert
          severity="success"
          variant="outlined"
          sx={{
            width: '100%',
            alignItems: 'center',
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderColor: 'divider',
            boxShadow: 3,
            '& .MuiAlert-icon': { color: 'success.main' },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
