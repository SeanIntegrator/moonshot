import type { CafeTheme } from '@moonshot/types';
import type { ThemeOptions } from '@mui/material/styles';

function borderRadiusFromCardStyle(cardStyle: CafeTheme['layout']['cardStyle']): number {
  switch (cardStyle) {
    case 'sharp':
      return 4;
    case 'pill':
      return 999;
    case 'rounded':
    default:
      return 12;
  }
}

/** Maps resolved `CafeTheme` tokens into a MUI `ThemeOptions` layer merged on top of `baseMuiTheme`. */
export function cafeTokensToMuiOptions(tokens: CafeTheme): ThemeOptions {
  const { colors, typography, layout } = tokens;
  const radius = borderRadiusFromCardStyle(layout.cardStyle);

  return {
    shape: { borderRadius: radius },
    palette: {
      primary: { main: colors.primary, contrastText: colors.primaryContrast },
      secondary: { main: colors.secondary, contrastText: colors.text },
      background: {
        default: colors.background,
        paper: colors.surfaceElevated,
      },
      text: {
        primary: colors.text,
        secondary: colors.textMuted,
      },
      divider: colors.border,
      success: { main: colors.success },
      warning: { main: colors.warning },
      error: { main: colors.error },
      cafe: {
        surface: colors.surface,
        surfaceElevated: colors.surfaceElevated,
        textMuted: colors.textMuted,
        textOnDark: colors.textOnDark,
        border: colors.border,
        heroBg: colors.heroBg,
        heroText: colors.heroText,
      },
    },
    typography: {
      fontFamily: typography.bodyFamily,
      h1: {
        fontFamily: typography.headingFamily,
        fontWeight: typography.headingWeight,
      },
      h2: {
        fontFamily: typography.headingFamily,
        fontWeight: typography.headingWeight,
      },
      h3: {
        fontFamily: typography.headingFamily,
        fontWeight: typography.headingWeight,
      },
      subtitle1: { fontFamily: typography.bodyFamily, fontWeight: typography.bodyWeight },
      subtitle2: { fontFamily: typography.bodyFamily, fontWeight: typography.bodyWeight },
      body1: { fontFamily: typography.bodyFamily, fontWeight: typography.bodyWeight },
      body2: { fontFamily: typography.bodyFamily, fontWeight: typography.bodyWeight },
      button: { fontFamily: typography.bodyFamily, fontWeight: 600 },
    },
    cafeLayout: layout,
  };
}
