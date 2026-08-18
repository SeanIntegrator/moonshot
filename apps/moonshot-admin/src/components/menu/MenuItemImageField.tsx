import type { MenuItemImageSource, NormalisedMenuItem } from '@moonshot/types';
import { resolveMenuTemplateDrinkKeyByExactName } from '@moonshot/domain';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  Switch,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import {
  setMenuItemUseDefaultImage,
  uploadMenuItemImage,
} from '../../lib/admin-api.js';

type Props = {
  cafeSlug: string;
  token: string;
  itemId: string | null;
  imageUrl: string | null;
  imageSource: MenuItemImageSource | null;
  useDefaultImage: boolean;
  /** When set, show the default-image toggle (POS-linked items only). */
  posItemId: string | null;
  itemName: string;
  disabled?: boolean;
  square?: boolean;
  hideLabel?: boolean;
  onUploaded: (item: NormalisedMenuItem) => void;
};

/** Photo preview + upload controls stacked for the item editor’s right column. */
export function MenuItemImageField({
  cafeSlug,
  token,
  itemId,
  imageUrl,
  imageSource,
  useDefaultImage,
  posItemId,
  itemName,
  disabled = false,
  square = false,
  hideLabel = false,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [togglingDefault, setTogglingDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPosItem = posItemId != null;
  const hasCustomImage = imageSource === 'pos' || imageSource === 'upload';
  const hasTemplateMatch = resolveMenuTemplateDrinkKeyByExactName(itemName) != null;
  const defaultToggleDisabled =
    disabled || !itemId || togglingDefault || hasCustomImage || !hasTemplateMatch;
  // Custom photos force the control off visually; opt-in flag drives it otherwise.
  const defaultToggleChecked = !hasCustomImage && useDefaultImage;

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

  async function handleDefaultToggle(next: boolean) {
    if (!itemId || defaultToggleDisabled) return;
    setTogglingDefault(true);
    setError(null);
    try {
      const updated = await setMenuItemUseDefaultImage(token, cafeSlug, itemId, next);
      onUploaded(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update default image');
    } finally {
      setTogglingDefault(false);
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      {hideLabel ? null : (
        <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary' }}>
          Item photo
        </Typography>
      )}
      <Box
        sx={{
          width: '100%',
          aspectRatio: square ? '1 / 1' : '4 / 3',
          maxHeight: square ? 160 : 180,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'action.hover',
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
        aria-label={
          imageUrl
            ? `${itemName} photo`
            : square
              ? 'Item photo square, 800x800'
              : 'Item photo, 4 by 3'
        }
      />
      <Box sx={{ mt: 1 }}>
        {!itemId ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
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
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mt: 0.75
              }}>
              JPEG, PNG, or WebP · max 5MB · resized to a small thumbnail automatically
            </Typography>
            {isPosItem ? (
              <Box sx={{ mt: 1.25 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={defaultToggleChecked}
                      disabled={defaultToggleDisabled}
                      onChange={(_, checked) => void handleDefaultToggle(checked)}
                    />
                  }
                  label="Use default image"
                />
                {hasCustomImage ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}>
                    Turned off while a custom photo is in use.
                  </Typography>
                ) : !hasTemplateMatch ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}>
                    No default photo for this item name.
                  </Typography>
                ) : null}
              </Box>
            ) : null}
          </>
        )}
        {(uploading || togglingDefault) && <LinearProgress sx={{ mt: 1 }} />}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
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
