import { Alert, Box, FormControlLabel, Link, Switch, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { fieldErrorProps } from '../../primitives/ValidationMessage.js';
import { isReviewUrlValid, normaliseReviewUrl, reviewUrlError } from './review-url.js';

export function ReviewNudgeCard() {
  const { cafe, patchSettings } = useCafe();
  const saved = cafe.features.review_nudge;
  const savedEnabled = Boolean(saved?.enabled);
  const savedUrl = saved?.reviewUrl ?? '';

  const [reviewUrl, setReviewUrl] = useState(savedUrl);
  const [showUrlError, setShowUrlError] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReviewUrl(savedUrl);
  }, [savedUrl]);

  const urlDirty = reviewUrl.trim() !== savedUrl.trim();
  const urlValid = isReviewUrlValid(reviewUrl);
  const urlMessage = showUrlError || urlDirty ? reviewUrlError(reviewUrl) : null;
  const visitHref = urlValid ? normaliseReviewUrl(reviewUrl) : null;

  async function onToggle(next: boolean) {
    setError(null);
    if (next) {
      if (!isReviewUrlValid(reviewUrl)) {
        setShowUrlError(true);
        return;
      }
      setSavingToggle(true);
      try {
        await patchSettings({
          featuresPatch: {
            review_nudge: { enabled: true, reviewUrl: normaliseReviewUrl(reviewUrl) },
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update review nudge');
      } finally {
        setSavingToggle(false);
      }
      return;
    }

    setSavingToggle(true);
    try {
      await patchSettings({
        featuresPatch: {
          review_nudge: {
            enabled: false,
            reviewUrl: savedUrl.trim() ? savedUrl : null,
          },
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update review nudge');
    } finally {
      setSavingToggle(false);
    }
  }

  async function saveUrl() {
    if (!urlValid) {
      setShowUrlError(true);
      return;
    }
    setSavingUrl(true);
    setError(null);
    try {
      await patchSettings({
        featuresPatch: {
          review_nudge: {
            enabled: savedEnabled,
            reviewUrl: normaliseReviewUrl(reviewUrl),
          },
        },
      });
      setShowUrlError(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save review link');
    } finally {
      setSavingUrl(false);
    }
  }

  return (
    <SettingsCard
      title="Review nudge"
      description={
        savedEnabled
          ? 'Asked after 3 on-time orders.'
          : "The review prompt is off. Customers aren't asked to rate you until you switch it back on."
      }
      headerAction={
        <FormControlLabel
          sx={{ mr: 0 }}
          control={
            <Switch
              checked={savedEnabled}
              disabled={savingToggle}
              onChange={(_, v) => void onToggle(v)}
            />
          }
          label={savedEnabled ? 'On' : 'Off'}
        />
      }
      save={{
        label: 'Save link',
        dirty: urlDirty,
        valid: urlValid,
        saving: savingUrl,
        onSave: () => void saveUrl(),
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <TextField
          label="Review URL"
          size="small"
          fullWidth
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          placeholder="https://g.page/r/…"
          disabled={savingUrl || savingToggle}
          {...fieldErrorProps(urlMessage)}
        />
        {visitHref ? (
          <Link
            href={visitHref}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 1, flexShrink: 0, fontWeight: 600 }}
          >
            Visit ↗
          </Link>
        ) : null}
      </Box>
    </SettingsCard>
  );
}
