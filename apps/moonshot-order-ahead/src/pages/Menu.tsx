import type { MenuCategory, NormalisedMenu, NormalisedMenuItem } from '@moonshot/types';
import { Alert, Box, Container, Snackbar, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryStrip } from '../components/CategoryStrip.js';
import { FloatingCartBar } from '../components/FloatingCartBar.js';
import { MenuItemCard } from '../components/MenuItemCard.js';
import { apiFetch } from '../lib/api.js';
import { groupMenuByCategory } from '../lib/menu-utils.js';
import { useCart } from '../providers/CartProvider.js';
import { fetchPickupEstimate } from '../api/orders-api.js';
import { formatTime } from '../lib/format.js';

function lineTotal(item: NormalisedMenuItem, qty: number): number {
  return item.priceMinor * qty;
}

function simpleLineQty(lines: ReturnType<typeof useCart>['lines'], menuItemId: string): number {
  const hit = lines.find((l) => l.menuItemId === menuItemId && l.modifiers.length === 0);
  return hit?.quantity ?? 0;
}

function totalCartQty(lines: ReturnType<typeof useCart>['lines']): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function Menu() {
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('hot_drinks');
  const [snack, setSnack] = useState<string | null>(null);
  const [pickupLabel, setPickupLabel] = useState<string | null>(null);
  const { lines, bumpSimpleQuantity } = useCart();
  const sectionRefs = useRef<Partial<Record<MenuCategory, HTMLDivElement | null>>>({});

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<NormalisedMenu>('/menu');
        setMenu(data);
        const sections = groupMenuByCategory(data);
        if (sections[0]) setActiveCategory(sections[0].category);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load menu');
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const est = await fetchPickupEstimate();
        setPickupLabel(formatTime(est.pickupTime));
      } catch {
        setPickupLabel(null);
      }
    })();
  }, []);

  const sections = useMemo(() => (menu ? groupMenuByCategory(menu) : []), [menu]);

  const cartTotalMinor = useMemo(() => {
    if (!menu) return 0;
    return lines.reduce((sum, line) => {
      const item = menu.items.find((i) => i.id === line.menuItemId);
      if (!item) return sum;
      let unit = item.priceMinor;
      for (const sel of line.modifiers) {
        const g = item.modifierGroups.find((x) => x.id === sel.groupId);
        const opt = g?.options.find((o) => o.id === sel.optionId);
        if (opt) unit += opt.priceMinor;
      }
      return sum + unit * line.quantity;
    }, 0);
  }, [menu, lines]);

  function scrollToCategory(cat: MenuCategory) {
    setActiveCategory(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function quickAdd(item: NormalisedMenuItem) {
    bumpSimpleQuantity(item.id, 1);
    setSnack(`${item.name} added to basket`);
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 14 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Typography variant="h4" component="h1" sx={{ mt: 0 }}>
          Order
        </Typography>
        {pickupLabel && (
          <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
            Pickup at {pickupLabel}
          </Typography>
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
      {!menu && !error && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Loading…
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
              <MenuItemCard
                key={item.id}
                item={item}
                qty={simpleLineQty(lines, item.id)}
                onQuickAdd={() => quickAdd(item)}
              />
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
        open={snack != null}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 120 }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack}
        </Alert>
      </Snackbar>
    </Container>
  );
}
