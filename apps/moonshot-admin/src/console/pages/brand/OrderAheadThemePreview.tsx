import type { BaseThemeId, CafeTheme } from '@moonshot/types';
import { radiiFromCardStyle, resolveCafeTheme } from '@moonshot/domain';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';

type Props = {
  themeId: BaseThemeId;
  brandColor: string | null;
  headingFontId: string | null;
  /** Home = full mock; Prompt = greeting only (same tokens). */
  variant?: 'home' | 'prompt';
};

function injectPreviewFonts(urls: string[]) {
  const marker = 'data-moonshot-admin-theme-font';
  document.querySelectorAll(`link[${marker}]`).forEach((n) => n.remove());
  for (const href of urls) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(marker, '1');
    document.head.appendChild(link);
  }
}

/** Scaled Home-like mock driven by resolveCafeTheme tokens (unsaved-safe). */
export function OrderAheadThemePreview({
  themeId,
  brandColor,
  headingFontId,
  variant = 'home',
}: Props) {
  const theme: CafeTheme = resolveCafeTheme(themeId, {
    brand: {
      ...(brandColor ? { color: brandColor } : {}),
      ...(headingFontId ? { headingFontId } : {}),
    },
  });
  const radii = radiiFromCardStyle(theme.layout.cardStyle);
  const { colors, typography } = theme;

  useEffect(() => {
    injectPreviewFonts(typography.webfontUrls ?? []);
  }, [typography.webfontUrls]);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: colors.background,
        maxWidth: 320,
        mx: 'auto',
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          bgcolor: colors.heroBg,
          color: colors.heroText,
          px: 2,
          py: theme.layout.heroStyle === 'full' ? 2.5 : 1.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: typography.headingFamily,
            fontWeight: typography.headingWeight,
            fontSize: '1.35rem',
            lineHeight: 1.2,
          }}
        >
          Hey Alex.
        </Typography>
        <Typography
          sx={{
            fontFamily: typography.bodyFamily,
            fontSize: '0.8rem',
            opacity: 0.85,
            mt: 0.5,
          }}
        >
          Ready for your next coffee?
        </Typography>
      </Box>

      {variant === 'prompt' ? null : (
      <Stack spacing={1.25} sx={{ p: 1.5 }}>
        {[
          { name: 'Flat White', price: '£3.40' },
          { name: 'Banana Bread', price: '£2.80' },
        ].map((item) => (
          <Box
            key={item.name}
            sx={{
              bgcolor: colors.surfaceElevated,
              border: `1px solid ${colors.border}`,
              borderRadius: `${radii.card}px`,
              px: 1.5,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: typography.headingFamily,
                  fontWeight: typography.headingWeight,
                  fontSize: '0.95rem',
                  color: colors.text,
                }}
              >
                {item.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: typography.bodyFamily,
                  fontSize: '0.75rem',
                  color: colors.textMuted,
                }}
              >
                {item.price}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              disableElevation
              sx={{
                bgcolor: colors.primary,
                color: colors.primaryContrast,
                fontFamily: typography.bodyFamily,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: `${radii.control}px`,
                px: 1.25,
                minWidth: 0,
                '&:hover': { bgcolor: colors.primary, filter: 'brightness(0.92)' },
              }}
            >
              Add
            </Button>
          </Box>
        ))}

        <Button
          fullWidth
          variant="contained"
          disableElevation
          sx={{
            mt: 0.5,
            bgcolor: colors.primary,
            color: colors.primaryContrast,
            fontFamily: typography.bodyFamily,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: `${radii.control}px`,
            py: 1.1,
            '&:hover': { bgcolor: colors.primary, filter: 'brightness(0.92)' },
          }}
        >
          Add to order
        </Button>
      </Stack>
      )}
    </Box>
  );
}
