import type {
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
  OrderType,
  PickupEstimateResponse,
} from '@moonshot/types';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AllergyChecklist } from '../components/AllergyChecklist.js';
import { CheckoutLineRow } from '../components/CheckoutLineRow.js';
import { PageHeader } from '../components/PageHeader.js';
import { PickupTimeChip } from '../components/PickupTimeChip.js';
import { RewardRow } from '../components/RewardRow.js';
import { CheckoutPageSkeleton } from '../components/skeletons/PageSkeletons.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { createCustomerOrder, fetchPickupEstimate } from '../api/orders-api.js';
import { rememberOrderTracking } from '../lib/order-tracking-storage.js';
import { useCart } from '../providers/CartProvider.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useMenu } from '../providers/MenuProvider.js';
import { formatMoney, formatTime } from '../lib/format.js';
import { unitPriceForItem } from '../lib/menu-price-utils.js';

function estimateLineMinor(
  item: NormalisedMenuItem,
  modifiers: OrderLineModifierSelectionInput[],
  sizeId: string | null,
): number {
  let delta = 0;
  for (const sel of modifiers) {
    const g = item.modifierGroups.find((x) => x.id === sel.groupId);
    const opt = g?.options.find((o) => o.id === sel.optionId);
    if (opt) delta += opt.priceMinor;
  }
  return unitPriceForItem(item, sizeId, delta);
}

function drinkDiscountMinor(
  pricedLines: { item: NormalisedMenuItem | undefined; unit: number | null }[],
): number {
  let max = 0;
  for (const row of pricedLines) {
    if (!row.item || row.unit == null) continue;
    if (row.item.category === 'hot_drinks' || row.item.category === 'cold_drinks') {
      max = Math.max(max, row.unit);
    }
  }
  return max;
}

export function Checkout() {
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { lines, clear, upsertLine, removeLine, pickupDelayMinutes, setPickupDelayMinutes } =
    useCart();
  const { orderAheadEnabled, loyaltyEnabled, pickupTimeEnabled, maxPickupMinutes } =
    useCafeFeatures();
  const { isSignedIn, user } = useAuth();
  const { summary, rewards, refresh: refreshLoyalty } = useLoyalty();
  const { menu, loading: menuLoading } = useMenu();
  const [customerName, setCustomerName] = useState('');
  const [orderType] = useState<OrderType>('takeaway');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PickupEstimateResponse | null>(null);
  const [allergyMode, setAllergyMode] = useState<'none' | 'allergies'>('none');
  const [checkoutAllergens, setCheckoutAllergens] = useState<string[]>([]);
  const [applyReward, setApplyReward] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!orderAheadEnabled) {
      navigate(cafePath('/'), { replace: true });
    }
  }, [orderAheadEnabled, navigate, cafePath]);

  useEffect(() => {
    if (isSignedIn && loyaltyEnabled) void refreshLoyalty();
  }, [isSignedIn, loyaltyEnabled, refreshLoyalty]);

  useEffect(() => {
    if (lines.length === 0) navigate(cafePath('/order'), { replace: true });
  }, [lines.length, navigate, cafePath]);

  useEffect(() => {
    if (user?.displayName) setCustomerName(user.displayName);
    else if (user?.email) setCustomerName(user.email.split('@')[0] ?? '');
  }, [user]);

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

  const pricedLines = useMemo(() => {
    if (!menu) return [];
    return lines.map((line) => {
      const item = menu.items.find((i) => i.id === line.menuItemId);
      const unit = item ? estimateLineMinor(item, line.modifiers, line.sizeId) : null;
      return { line, item, unit };
    });
  }, [menu, lines]);

  const subtotalMinor = useMemo(
    () =>
      pricedLines.reduce((sum, row) => {
        if (row.unit == null) return sum;
        return sum + row.unit * row.line.quantity;
      }, 0),
    [pricedLines],
  );

  const discountMinor = applyReward && rewards.length > 0 ? drinkDiscountMinor(pricedLines) : 0;
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  async function placeOrder(): Promise<void> {
    if (lines.length === 0) return;
    const name =
      customerName.trim() || user?.displayName?.trim() || user?.email?.split('@')[0] || 'Guest';
    setError(null);
    setSubmitting(true);
    try {
      const allergensForLines =
        allergyMode === 'allergies' && checkoutAllergens.length > 0 ? checkoutAllergens : [];

      const data = await createCustomerOrder({
        customerName: name,
        orderType,
        redeemRewardId: applyReward && rewards[0] ? rewards[0].id : undefined,
        pickupDelayMinutes: pickupTimeEnabled ? pickupDelayMinutes : undefined,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          sizeId: l.sizeId ?? undefined,
          quantity: l.quantity,
          modifiers: l.modifiers.length ? l.modifiers : undefined,
          allergens: allergensForLines.length
            ? allergensForLines
            : l.allergens.length
              ? l.allergens
              : undefined,
        })),
      });
      rememberOrderTracking(data.order.id, data.trackingToken);
      if (data.checkoutUrl) {
        setRedirecting(true);
        window.location.assign(data.checkoutUrl);
        return;
      }
      clear();
      navigate(cafePath(`/orders/${data.order.id}/confirmed`), {
        replace: true,
        state: { discountMinor: data.discountMinor ?? 0 },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (redirecting) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Taking you to payment
        </Typography>
      </Box>
    );
  }

  if (menuLoading && !menu) {
    return <CheckoutPageSkeleton />;
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <PageHeader title="Checkout" onBack={() => navigate(cafePath('/order'))} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Your order
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {itemCount} items
            </Typography>
          </Box>

          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.25,
              bgcolor: 'background.paper',
              overflow: 'hidden',
              minHeight: pricedLines.length > 0 ? undefined : 120,
            }}
          >
            {pricedLines.map(({ line, item, unit }, index) => (
              <CheckoutLineRow
                key={line.key}
                line={line}
                item={item}
                unitMinor={unit}
                isLast={index === pricedLines.length - 1 && discountMinor === 0}
                onQtyChange={(qty) => {
                  if (qty <= 0) removeLine(line.key);
                  else upsertLine({ ...line, quantity: qty });
                }}
              />
            ))}
            {discountMinor > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 1,
                  color: 'success.main',
                  borderTop: pricedLines.length > 0 ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Loyalty (−1 free)
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  −{formatMoney(discountMinor)}
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                px: 1.5,
                py: 1.25,
                borderTop: pricedLines.length > 0 || discountMinor > 0 ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body1" fontWeight={700}>
                Total
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(totalMinor)}
              </Typography>
            </Box>
          </Box>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
            Pickup time
          </Typography>
          {pickupTimeEnabled ? (
            <PickupTimeChip
              estimate={estimate}
              value={pickupDelayMinutes}
              onChange={setPickupDelayMinutes}
              maxPickupMinutes={maxPickupMinutes}
            />
          ) : (
            <Box
              sx={{
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                minHeight: 72,
              }}
            >
              <AccessTimeIcon color="action" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" fontWeight={700}>
                  {estimate ? formatTime(estimate.pickupTime) : 'ASAP'}
                </Typography>
                {estimate && (
                  <Typography variant="caption" color="text.secondary">
                    in {estimate.minutesFromNow} min
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
            Allergy info
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={allergyMode}
            onChange={(_, v) => v && setAllergyMode(v)}
            size="small"
            sx={{
              mb: 1,
              bgcolor: 'action.hover',
              borderRadius: 999,
              p: 0.5,
              border: 0,
              '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                borderRadius: '999px !important',
                mx: 0,
                flex: 1,
              },
              '& .MuiToggleButton-root': {
                border: 0,
                borderRadius: 999,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'text.secondary',
                transition: 'background-color 180ms ease, color 180ms ease, box-shadow 180ms ease',
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  boxShadow: 1,
                },
                '&:not(.Mui-selected)': {
                  bgcolor: 'transparent',
                },
              },
            }}
          >
            <ToggleButton value="none">None</ToggleButton>
            <ToggleButton value="allergies">I have allergies</ToggleButton>
          </ToggleButtonGroup>
          {allergyMode === 'allergies' && (
            <AllergyChecklist selected={checkoutAllergens} onChange={setCheckoutAllergens} />
          )}

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 0.5 }}>
            Rewards
          </Typography>
          {isSignedIn && loyaltyEnabled && summary && rewards.length > 0 ? (
            <RewardRow
              description="1 free drink available"
              applied={applyReward}
              onToggle={setApplyReward}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {!loyaltyEnabled
                ? 'Loyalty is not enabled for this café.'
                : !isSignedIn
                  ? 'Sign in to earn stamps and redeem rewards.'
                  : 'No vouchers or rewards available. Earn 1 stamp with this order.'}
            </Typography>
          )}
        </Box>

        <Box sx={{ pt: 2, flexShrink: 0 }}>
          {error && (
            <Typography color="error" sx={{ mb: 1.5 }}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            sx={{
              py: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              '&.Mui-disabled': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                opacity: 0.85,
              },
            }}
            disabled={submitting || pricedLines.length === 0}
            onClick={() => void placeOrder()}
          >
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {submitting && (
                <CircularProgress size={18} color="inherit" sx={{ color: 'primary.contrastText' }} />
              )}
              {submitting ? 'Placing…' : 'Place order'}
            </Box>
            <span>{formatMoney(totalMinor)} →</span>
          </Button>
          {loyaltyEnabled && isSignedIn && !applyReward && (
            <Typography
              variant="caption"
              color="success.main"
              sx={{ display: 'block', textAlign: 'center', mt: 1 }}
            >
              Earn 1 stamp with this order
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}
