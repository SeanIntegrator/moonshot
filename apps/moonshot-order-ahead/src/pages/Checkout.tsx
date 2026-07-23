import type { LoyaltySummaryResponse, OrderType } from '@moonshot/types';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  ToggleButton,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AllergyChecklist } from '../components/AllergyChecklist.js';
import { CheckoutOrderSummary } from '../components/CheckoutOrderSummary.js';
import { PageHeader } from '../components/PageHeader.js';
import { PickupTimeChip } from '../components/PickupTimeChip.js';
import { RewardRow } from '../components/RewardRow.js';
import { CheckoutPageSkeleton } from '../components/skeletons/PageSkeletons.js';
import { SegmentedToggleGroup } from '../components/ui/SegmentedToggleGroup.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { useCafeOpenStatus } from '../hooks/useCafeOpenStatus.js';
import { useCheckoutPricing } from '../hooks/useCheckoutPricing.js';
import { usePickupEstimate } from '../hooks/usePickupEstimate.js';
import { createCustomerOrder } from '../api/orders-api.js';
import { rememberOrderTracking } from '../lib/order-tracking-storage.js';
import { useCart } from '../providers/CartProvider.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useMenu } from '../providers/MenuProvider.js';
import { formatMoney, formatTime } from '../lib/format.js';

const ORDER_TYPE: OrderType = 'takeaway';

function stampsUntilRewardCopy(summary: LoyaltySummaryResponse): string {
  const remaining = Math.max(0, summary.stampsPerReward - summary.stamps);
  if (remaining === 1) return '1 more stamp until your next reward';
  return `${remaining} more stamps until your next reward`;
}

export function Checkout() {
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { lines, clear, upsertLine, removeLine, pickupDelayMinutes, setPickupDelayMinutes } =
    useCart();
  const { loyaltyEnabled, pickupTimeEnabled, maxPickupMinutes } = useCafeFeatures();
  const { isOpen, closedBarMessage } = useCafeOpenStatus();
  const { isSignedIn, user } = useAuth();
  const { summary, rewards, refresh: refreshLoyalty } = useLoyalty();
  const { menu, loading: menuLoading } = useMenu();
  const { estimate } = usePickupEstimate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allergyMode, setAllergyMode] = useState<'none' | 'allergies'>('none');
  const [checkoutAllergens, setCheckoutAllergens] = useState<string[]>([]);
  const [applyReward, setApplyReward] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  /** True once we clear the cart and head to confirmed — blocks empty-cart → menu bounce. */
  const [leavingToConfirmed, setLeavingToConfirmed] = useState(false);

  useEffect(() => {
    if (isSignedIn && loyaltyEnabled) void refreshLoyalty();
  }, [isSignedIn, loyaltyEnabled, refreshLoyalty]);

  useEffect(() => {
    // Skip while placing / leaving for confirmed — clear() empties the cart before navigate.
    if (lines.length === 0 && !submitting && !redirecting && !leavingToConfirmed) {
      navigate(cafePath('/order'), { replace: true });
    }
  }, [lines.length, navigate, cafePath, submitting, redirecting, leavingToConfirmed]);

  const { pricedLines, discountMinor, totalMinor, itemCount } = useCheckoutPricing({
    lines,
    menuItems: menu?.items,
    applyReward,
    hasRewards: rewards.length > 0,
  });

  async function placeOrder(): Promise<void> {
    if (!isOpen || lines.length === 0) return;
    const name =
      user?.displayName?.trim() || user?.email?.split('@')[0] || 'Guest';
    setError(null);
    setSubmitting(true);
    try {
      const allergensForLines =
        allergyMode === 'allergies' && checkoutAllergens.length > 0 ? checkoutAllergens : [];

      const data = await createCustomerOrder({
        customerName: name,
        orderType: ORDER_TYPE,
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
      setLeavingToConfirmed(true);
      clear();
      navigate(cafePath(`/orders/${data.order.id}/confirmed`), {
        replace: true,
        state: { order: data.order, discountMinor: data.discountMinor ?? 0 },
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
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Container
        maxWidth="sm"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 2 }}
      >
        <Box sx={{ flex: 1 }}>
          <PageHeader title="Checkout" onBack={() => navigate(cafePath('/order'))} />
          <CheckoutOrderSummary
            pricedLines={pricedLines}
            itemCount={itemCount}
            discountMinor={discountMinor}
            totalMinor={totalMinor}
            onQtyChange={(line, qty) => {
              if (qty <= 0) removeLine(line.key);
              else upsertLine({ ...line, quantity: qty });
            }}
          />

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
            Pickup time
          </Typography>
          {pickupTimeEnabled ? (
            <PickupTimeChip
              estimate={estimate}
              value={pickupDelayMinutes}
              onChange={setPickupDelayMinutes}
              maxPickupMinutes={maxPickupMinutes}
              variant="field"
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
          <SegmentedToggleGroup
            exclusive
            fullWidth
            value={allergyMode}
            onChange={(_, v) => v && setAllergyMode(v)}
            size="small"
          >
            <ToggleButton value="none">None</ToggleButton>
            <ToggleButton value="allergies">I have allergies</ToggleButton>
          </SegmentedToggleGroup>
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
                  : summary
                    ? stampsUntilRewardCopy(summary)
                    : 'Earn stamps with this order.'}
            </Typography>
          )}
        </Box>

        <Box sx={{ pt: 2, flexShrink: 0 }}>
          {error && (
            <Typography color="error" sx={{ mb: 1.5 }}>
              {error}
            </Typography>
          )}
          {!isOpen && (
            <Typography color="warning.dark" sx={{ mb: 1.5 }} fontWeight={600}>
              {closedBarMessage}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            sx={{
              py: 2,
              minHeight: 56,
              display: 'flex',
              justifyContent: 'space-between',
              '&.Mui-disabled': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                opacity: 0.85,
              },
            }}
            disabled={submitting || pricedLines.length === 0 || !isOpen}
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
