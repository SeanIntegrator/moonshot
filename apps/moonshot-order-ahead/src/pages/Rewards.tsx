import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { Box, Button, Container, LinearProgress, Typography } from '@mui/material';
import type { LoyaltySummaryResponse } from '@moonshot/domain';
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { LoyaltyStampCard } from '../components/LoyaltyStampCard.js';
import { QrCard } from '../components/QrCard.js';
import { SectionHead } from '../components/SectionHead.js';
import { SignedOutPanel } from '../components/SignedOutPanel.js';
import { SurfaceCard } from '../components/ui/SurfaceCard.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { formatShortDate } from '../lib/format.js';

function stampsUntilRewardCopy(summary: LoyaltySummaryResponse): string {
  const remaining = Math.max(0, summary.stampsPerReward - summary.stamps);
  if (remaining === 1) return '1 stamp until next reward';
  return `${remaining} stamps until next reward`;
}

export function Rewards() {
  const { isSignedIn, loading: authLoading, user } = useAuth();
  const {
    summary,
    rewards,
    transactions,
    loading,
    loadMore,
    nextCursor,
    loadingMore,
    ensureTransactions,
  } = useLoyalty();
  const cafePath = useCafePath();

  useEffect(() => {
    if (!isSignedIn || authLoading) return;
    void ensureTransactions();
  }, [isSignedIn, authLoading, ensureTransactions]);

  const redeemed = transactions.filter((t) => t.transactionType === 'reward_redeemed');
  const rewardsAvailable = summary?.rewardsAvailable ?? 0;
  // Summary count is source of truth; synthesize placeholders if the list fetch lagged.
  const rewardCards =
    rewardsAvailable > 0
      ? rewards.length > 0
        ? rewards
        : Array.from({ length: rewardsAvailable }, (_, i) => ({ id: `summary-reward-${i}` }))
      : [];

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
      {authLoading && <Typography color="text.secondary">Checking session…</Typography>}

      {!authLoading && !isSignedIn && <SignedOutPanel onContinueGuest={() => {}} />}

      {isSignedIn && loading && <LinearProgress sx={{ mt: 2 }} />}

      {isSignedIn && !loading && summary && summary.loyaltyEnabled && (
        <Box sx={{ mt: 2 }}>
          <QrCard
            displayId={summary.displayId}
            name={user?.displayName ?? undefined}
            stamps={summary.stamps}
            stampsPerReward={summary.stampsPerReward}
            size={220}
          />

          <Box sx={{ mt: 2 }}>
            <LoyaltyStampCard
              filled={summary.stamps}
              total={summary.stampsPerReward}
              rewardsAvailable={summary.rewardsAvailable}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <SectionHead title="Your rewards" />
            {rewardCards.length > 0 ? (
              rewardCards.map((reward) => (
                <SurfaceCard
                  key={reward.id}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CardGiftcardIcon color="success" fontSize="small" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {summary.rewardDescription || 'Free drink'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ready to redeem at checkout
                    </Typography>
                  </Box>
                </SurfaceCard>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {stampsUntilRewardCopy(summary)}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {isSignedIn && !loading && summary && !summary.loyaltyEnabled && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Loyalty off
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This café hasn&apos;t enabled stamps yet.
          </Typography>
          <Button component={RouterLink} to={cafePath('/order')} variant="contained">
            Browse menu →
          </Button>
        </Box>
      )}

      {isSignedIn &&
        !loading &&
        summary?.loyaltyEnabled &&
        summary.stamps === 0 &&
        summary.rewardsAvailable === 0 &&
        redeemed.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              No stamps yet
            </Typography>
            <Button component={RouterLink} sx={{ mt: 2 }} to={cafePath('/order')} variant="contained">
              Browse menu →
            </Button>
          </Box>
        )}

      {isSignedIn && !loading && redeemed.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <SectionHead eyebrow="History" title="Redeemed" />
          {redeemed.map((t) => (
            <SurfaceCard
              key={t.id}
              sx={{
                p: 1.5,
                mb: 1,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                Free drink
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatShortDate(t.createdAt)}
              </Typography>
            </SurfaceCard>
          ))}
          {nextCursor && (
            <Button size="small" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </Box>
      )}
    </Container>
  );
}
