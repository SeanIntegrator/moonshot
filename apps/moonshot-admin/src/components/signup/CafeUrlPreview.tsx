import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { getOrderAheadBaseUrl } from '../../lib/onboarding-utils.js';
import { orderAheadHostPath, resolveAvailableSlug } from '../../lib/cafe-url.js';

type Props = {
  cafeName: string;
  /** Called whenever the previewed slug changes (for optional register hint). */
  onSlugResolved?: (slug: string) => void;
};

type Status = 'idle' | 'checking' | 'ready';

/**
 * Read-only order-ahead URL preview derived from the café name.
 * Owners never edit a slug field — collisions get a -2 suffix automatically.
 */
export function CafeUrlPreview({ cafeName, onSlugResolved }: Props) {
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderBase = getOrderAheadBaseUrl();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = cafeName.trim();
    if (trimmed.length < 2) {
      setSlug('');
      setStatus('idle');
      return;
    }
    setStatus('checking');
    debounceRef.current = setTimeout(() => {
      void resolveAvailableSlug(trimmed).then((resolved) => {
        setSlug(resolved);
        setStatus('ready');
        onSlugResolved?.(resolved);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cafeName, onSlugResolved]);

  if (status === 'idle') return null;

  return (
    <Box
      sx={{
        mt: 1,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 24,
      }}
      aria-live="polite"
    >
      {status === 'checking' ? (
        <>
          <CircularProgress size={14} color="inherit" sx={{ opacity: 0.5 }} />
          <Typography variant="caption" color="text.secondary">
            Checking your order URL…
          </Typography>
        </>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          Your order page:{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            {orderAheadHostPath(orderBase, slug)}
          </Box>
        </Typography>
      )}
    </Box>
  );
}
