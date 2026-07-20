import { Box, Skeleton } from '@mui/material';
import { useState } from 'react';

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
  objectFit?: 'cover' | 'contain';
};

/**
 * Fixed-size menu thumbnail with lazy loading and a neutral placeholder fallback.
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
  objectFit = 'contain',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

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
          src={src!}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            display: 'block',
          }}
        />
      )}
      {showImage && !loaded && (
        <Skeleton
          variant="rectangular"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      )}
    </Box>
  );
}
