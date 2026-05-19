import {
  Box,
  Button,
  Container,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { redeemLoyaltyReward } from '../api/loyalty-api.js';
import { SignInButton } from '../components/auth/SignInButton.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';

export function Rewards() {
  const { isSignedIn, loading: authLoading } = useAuth();
  const { summary, transactions, rewards, loading, loadingMore, refresh, loadMore, nextCursor } =
    useLoyalty();

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
      <Typography variant="h4" component="h1">
        Rewards
      </Typography>

      {authLoading && <Typography color="text.secondary">Checking session…</Typography>}

      {!authLoading && !isSignedIn && (
        <Box sx={{ mt: 2 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Sign in to see stamps and redeem free drinks.
          </Typography>
          <SignInButton />
        </Box>
      )}

      {isSignedIn && loading && <LinearProgress sx={{ mt: 2 }} />}

      {isSignedIn && !loading && summary && (
        <Box sx={{ mt: 2, p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Typography variant="h6">
            {summary.loyaltyEnabled ? `${summary.stamps} / ${summary.stampsPerReward} stamps` : 'Loyalty off'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.rewardDescription} · {summary.rewardsAvailable} reward(s) ready
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            Till code: <strong>{summary.displayId}</strong>
          </Typography>
        </Box>
      )}

      {isSignedIn && !loading && rewards.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }} fontWeight={700}>
            Ready to redeem
          </Typography>
          <List dense disablePadding>
            {rewards.map((r) => (
              <ListItem
                key={r.id}
                disableGutters
                secondaryAction={
                  <Button
                    size="small"
                    variant="contained"
                    onClick={async () => {
                      await redeemLoyaltyReward(r.id);
                      await refresh();
                    }}
                  >
                    Redeem
                  </Button>
                }
              >
                <ListItemText primary={r.rewardType.replace(/_/g, ' ')} secondary={`Issued ${new Date(r.createdAt).toLocaleString()}`} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {isSignedIn && !loading && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }} fontWeight={700}>
            History
          </Typography>
          {transactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No ledger entries yet.
            </Typography>
          ) : (
            <List dense disablePadding>
              {transactions.map((t) => (
                <ListItem key={t.id} disableGutters>
                  <ListItemText
                    primary={t.transactionType.replace(/_/g, ' ')}
                    secondary={`${t.stampsDelta >= 0 ? '+' : ''}${t.stampsDelta} stamps · ${new Date(t.createdAt).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          {nextCursor && (
            <Button size="small" sx={{ mt: 1 }} disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </>
      )}
    </Container>
  );
}
