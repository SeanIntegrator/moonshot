import type { MenuCategory, NormalisedMenu, PickupEstimateResponse } from '@moonshot/types';
import { Box, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryStrip } from '../components/CategoryStrip.js';
import { FloatingCartBar } from '../components/FloatingCartBar.js';
import { MenuItemCard } from '../components/MenuItemCard.js';
import { PickupTimeChip } from '../components/PickupTimeChip.js';
import { apiFetch } from '../lib/api.js';
import { groupMenuByCategory } from '../lib/menu-utils.js';
import { useCart } from '../providers/CartProvider.js';
import { fetchPickupEstimate } from '../api/orders-api.js';

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
  const [estimate, setEstimate] = useState<PickupEstimateResponse | null>(null);
  const { lines, pickupDelayMinutes, setPickupDelayMinutes } = useCart();
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

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 14 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ mt: 0 }}>
          Order
        </Typography>
        <PickupTimeChip
          estimate={estimate}
          value={pickupDelayMinutes}
          onChange={setPickupDelayMinutes}
        />
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

    </Container>
  );
}
