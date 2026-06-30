import type { NormalisedMenuItem } from '@moonshot/types';
import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { uploadMenuItemImage } from '../../lib/admin-api.js';

type Props = {
  cafeSlug: string;
  token: string;
  itemId: string | null;
  imageUrl: string | null;
  itemName: string;
  disabled?: boolean;
  onUploaded: (item: NormalisedMenuItem) => void;
};

export function MenuItemImageField({
  cafeSlug,
  token,
  itemId,
  imageUrl,
  itemName,
  disabled = false,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file || !itemId) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await uploadMenuItemImage(token, cafeSlug, itemId, file);
      onUploaded(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Item photo
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box
          sx={{
            width: 120,
            height: 80,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'action.hover',
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
          aria-label={imageUrl ? `${itemName} photo` : 'No photo'}
        />
        <Box sx={{ flex: 1, minWidth: 180 }}>
          {!itemId ? (
            <Typography variant="body2" color="text.secondary">
              Save the item first, then upload a photo.
            </Typography>
          ) : (
            <>
              <Button
                variant="outlined"
                size="small"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
              >
                {imageUrl ? 'Replace photo' : 'Upload photo'}
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                JPEG, PNG, or WebP · max 5MB · resized to a small thumbnail automatically
              </Typography>
            </>
          )}
          {uploading && <LinearProgress sx={{ mt: 1 }} />}
          {error && (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />
    </Box>
  );
}
