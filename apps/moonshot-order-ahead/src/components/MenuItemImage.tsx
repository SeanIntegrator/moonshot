import { Box, Skeleton } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  getMenuImageStatus,
  isMenuImageReady,
  watchMenuImage,
} from '../lib/menu-image-cache.js';

type Props = {
  src: string | null | undefined;
  alt: string;
  /** CSS aspect-ratio value, e.g. "3 / 2" or "1" */
  aspectRatio?: string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  /**
   * Catalogue surfaces should use `cover` so the frame fills (no grey/white sidebars).
   * `contain` letterboxes; both pin to the top so the bottom crops / empties first.
   */
  objectFit?: 'cover' | 'contain';
  /** Called when the visible image layer is ready (or failed / missing). */
  onReadyChange?: (ready: boolean) => void;
};

/**
 * Fixed-size menu thumbnail.
 * Top-anchored fit so product tops stay visible; skeleton until decoded.
 */
export function MenuItemImage({
  src,
  alt,
  aspectRatio = '3 / 2',
  width = '100%',
  height,
  borderRadius = 1.25,
  loading = 'lazy',
  fetchPriority,
  objectFit = 'cover',
  onReadyChange,
}: Props) {
  const url = src?.trim() || null;
  const [loaded, setLoaded] = useState(() => isMenuImageReady(url));
  const [failed, setFailed] = useState(() => getMenuImageStatus(url) === 'error');
  const onReadyRef = useRef(onReadyChange);
  onReadyRef.current = onReadyChange;

  useEffect(() => {
    const notify = (ready: boolean) => onReadyRef.current?.(ready);

    if (!url) {
      setLoaded(true);
      setFailed(false);
      notify(true);
      return;
    }

    const cached = getMenuImageStatus(url);
    if (cached === 'loaded') {
      setLoaded(true);
      setFailed(false);
      notify(true);
      return;
    }
    if (cached === 'error') {
      setLoaded(true);
      setFailed(true);
      notify(true);
      return;
    }

    setLoaded(false);
    setFailed(false);
    notify(false);

    return watchMenuImage(url, () => {
      const next = getMenuImageStatus(url);
      setLoaded(next === 'loaded' || next === 'error');
      setFailed(next === 'error');
      notify(true);
    });
  }, [url]);

  const showImage = Boolean(url) && !failed;
  const ready = !showImage || loaded;

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height: height ?? 'auto',
        aspectRatio: height ? undefined : aspectRatio,
        borderRadius,
        overflow: 'hidden',
        bgcolor: 'action.hover',
        flexShrink: 0,
      }}
    >
      {showImage && (
        <Box
          component="img"
          src={url!}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={(e) => {
            // Cached images can fire before effect subscribe; mark ready immediately.
            if (e.currentTarget.complete) {
              setLoaded(true);
              onReadyRef.current?.(true);
            }
          }}
          onError={() => {
            setFailed(true);
            setLoaded(true);
            onReadyRef.current?.(true);
          }}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            // Pin to top so overflow (cover) or letterbox slack (contain) eats the bottom first.
            objectPosition: 'top center',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 160ms ease',
          }}
        />
      )}
      {!ready && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      )}
    </Box>
  );
}
