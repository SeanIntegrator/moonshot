import { Box, Button, Container, LinearProgress, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { LoyaltyStampCard } from '../components/LoyaltyStampCard.js';
import { QrCard } from '../components/QrCard.js';
import { SectionHead } from '../components/SectionHead.js';
import { SignedOutPanel } from '../components/SignedOutPanel.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { formatShortDate } from '../lib/format.js';

export function Rewards() {
  const { isSignedIn, loading: authLoading, user } = useAuth();
  const { summary, transactions, loading, loadMore, nextCursor, loadingMore } = useLoyalty();
  const cafePath = useCafePath();

  const redeemed = transactions.filter((t) => t.transactionType === 'reward_redeemed');

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

          {summary.rewardsAvailable > 0 && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1.5, textAlign: 'center' }}>
              {summary.rewardsAvailable} reward{summary.rewardsAvailable !== 1 ? 's' : ''} ready to
              redeem at checkout
            </Typography>
          )}
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
            <Box
              key={t.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.25,
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
            </Box>
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
