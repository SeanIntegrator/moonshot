import type { MenuCategory, MenuGridLayout } from '@moonshot/types';
import { Alert, Box, Container, Snackbar, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
import { unitPriceForItem } from '../lib/menu-price-utils.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { useCafeOpenStatus } from '../hooks/useCafeOpenStatus.js';
import { usePickupEstimate } from '../hooks/usePickupEstimate.js';
import { pageContentWidthSx, toastBottomPx } from '../theme/pageLayout.js';

function menuGridTemplateColumns(menuGrid: MenuGridLayout): string {
  switch (menuGrid) {
    case '3col':
      return 'repeat(3, 1fr)';
    case 'list':
      return '1fr';
    case '2col':
    default:
      return '1fr 1fr';
  }
}

function simpleLineQty(lines: ReturnType<typeof useCart>['lines'], menuItemId: string): number {
  const hit = lines.find(
    (l) => l.menuItemId === menuItemId && l.modifiers.length === 0 && !l.sizeId,
  );
  return hit?.quantity ?? 0;
}

type MenuLocationState = {
  addedItemName?: string;
};

export function Menu() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { pickupTimeEnabled, maxPickupMinutes } = useCafeFeatures();
  const { isOpen, closedBarMessage } = useCafeOpenStatus();
  const { estimate } = usePickupEstimate();
  const locationState = location.state as MenuLocationState | null;
  const { menu, loading, error } = useMenu();
  const [activeCategory, setActiveCategory] = useState<MenuCategory | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { lines, itemCount, pickupDelayMinutes, setPickupDelayMinutes } = useCart();
  const sectionRefs = useRef<Partial<Record<MenuCategory, HTMLDivElement | null>>>({});
  const cafeClosed = !isOpen;
  const cartQty = itemCount;
  const gridTemplateColumns = menuGridTemplateColumns(theme.cafeLayout.menuGrid);

  useEffect(() => {
    if (!locationState?.addedItemName) return;
    setToastMessage(`${locationState.addedItemName} added to basket`);
    navigate('.', { replace: true, state: null });
  }, [locationState?.addedItemName, navigate]);

  const sections = useMemo(() => (menu ? groupMenuByCategory(menu) : []), [menu]);

  // Keep strip selection valid: first section when unset/empty, or when current key vanishes.
  useEffect(() => {
    if (sections.length === 0) {
      setActiveCategory(null);
      return;
    }
    setActiveCategory((prev) =>
      prev && sections.some((s) => s.category === prev) ? prev : sections[0]!.category,
    );
  }, [sections]);

  const resolvedActive = activeCategory ?? sections[0]?.category ?? '';

  const cartTotalMinor = useMemo(() => {
    if (!menu) return 0;
    return lines.reduce((sum, line) => {
      const item = menu.items.find((i) => i.id === line.menuItemId);
      if (!item) return sum;
      const unit = unitPriceForItem(item, line.sizeId, line.modifiers);
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
        <CategoryStrip sections={sections} active={resolvedActive} onSelect={scrollToCategory} />
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
            {section.label}
            {` · ${section.items.length} items`}
          </Typography>

          {section.items.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns,
                gap: 1.25,
                mt: 1,
              }}
            >
              {section.items.map((item) => (
                <MenuItemCard key={item.id} item={item} qty={simpleLineQty(lines, item.id)} />
              ))}
            </Box>
          )}
        </Box>
      ))}

      <FloatingCartBar
        itemCount={cartQty}
        totalMinor={cartTotalMinor}
        currency={menu?.items[0]?.currency}
        cafeClosed={cafeClosed}
        closedMessage={closedBarMessage}
      />

      <Snackbar
        open={toastMessage != null}
        autoHideDuration={2500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: toastBottomPx(cafeClosed || cartQty > 0),
          px: 2,
          ...pageContentWidthSx,
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
