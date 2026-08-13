import type { CustomerServerToClientEvent } from '@moonshot/types';
import { resolveReviewUrl } from '@moonshot/domain';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { confirmReviewPrompt } from '../api/feedback-api.js';
import { ReviewNudgeModal } from '../components/ReviewNudgeModal.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCafe } from '../hooks/useCafe.js';
import { useCustomerEvents } from './CustomerEventsProvider.js';

/**
 * Single-CTA review prompt after 3 on-time app orders.
 *
 * Opens from:
 * - socket `customerReviewEligible` (live, while order room still subscribed)
 * - `/auth/me` membership `reviewPromptState === 'eligible'` (next visit / missed socket)
 * - `customerOrderCompleted` → auth.refresh() (2s loyalty budget may emit complete first)
 */
export function ReviewNudgeProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, loading: authLoading, membership, refresh, user } = useAuth();
  const { cafe } = useCafe();
  const { subscribe } = useCustomerEvents();

  const [open, setOpen] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Local lock so we do not reopen after confirm before auth.refresh settles. */
  const dismissedRef = useRef(false);
  const userId = user?.id;

  // New session / different account — allow the prompt again if they are eligible.
  useEffect(() => {
    dismissedRef.current = false;
    setOpen(false);
  }, [userId]);

  const cafeReviewUrl = resolveReviewUrl(cafe?.features.review_nudge ?? null);

  const openPrompt = useCallback((url: string | null) => {
    if (dismissedRef.current) return;
    setReviewUrl(url);
    setOpen(true);
  }, []);

  // Persisted eligibility (next visit / cold start).
  useEffect(() => {
    if (authLoading || !isSignedIn) return;
    if (membership?.reviewPromptState === 'eligible' && !dismissedRef.current) {
      openPrompt(cafeReviewUrl);
    }
  }, [
    authLoading,
    isSignedIn,
    membership?.reviewPromptState,
    cafeReviewUrl,
    openPrompt,
  ]);

  // Socket: live eligibility + same-session fallback via auth.refresh on complete.
  useEffect(() => {
    if (!isSignedIn || authLoading) return;

    return subscribe((ev: CustomerServerToClientEvent) => {
      if (ev.type === 'customerReviewEligible') {
        openPrompt(ev.reviewUrl ?? cafeReviewUrl);
        return;
      }
      if (ev.type === 'customerOrderCompleted') {
        // Cover missed review emit when loyalty apply overran the budget.
        void refresh();
      }
    });
  }, [isSignedIn, authLoading, subscribe, openPrompt, cafeReviewUrl, refresh]);

  const finish = useCallback(
    async (action: 'opened_url' | 'dismissed') => {
      if (submitting) return;
      setSubmitting(true);
      try {
        await confirmReviewPrompt(action);
        dismissedRef.current = true;
        setOpen(false);
        await refresh();
      } catch {
        // Keep modal open so the user can retry dismiss / CTA.
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, refresh],
  );

  const onRateUs = useCallback(() => {
    if (reviewUrl) {
      window.open(reviewUrl, '_blank', 'noopener,noreferrer');
    }
    void finish('opened_url');
  }, [reviewUrl, finish]);

  const onDismiss = useCallback(() => {
    void finish('dismissed');
  }, [finish]);

  return (
    <>
      {children}
      <ReviewNudgeModal
        open={open && isSignedIn}
        reviewUrl={reviewUrl}
        submitting={submitting}
        onRateUs={onRateUs}
        onDismiss={onDismiss}
      />
    </>
  );
}
