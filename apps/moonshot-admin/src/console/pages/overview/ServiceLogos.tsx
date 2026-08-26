import { Box } from '@mui/material';
import squareLogo from './assets/square-logo-2025-black.png';

/** Shared width so Square + Stripe wordmarks align in the connection row. */
const LOGO_WIDTH = 60;

/** Square 2025 wordmark (mark + “Square”) on transparent. */
export function SquareLogo() {
  return (
    <Box
      component="img"
      src={squareLogo}
      alt=""
      aria-hidden
      sx={{
        width: LOGO_WIDTH,
        height: 'auto',
        display: 'block',
        objectFit: 'contain',
        flexShrink: 0,
      }}
    />
  );
}

/** Stripe wordmark — blurple on transparent (inline SVG, no black plate). */
export function StripeLogo() {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 60 26"
      sx={{
        width: LOGO_WIDTH,
        height: 'auto',
        display: 'block',
        flexShrink: 0,
      }}
    >
      <text
        x="0"
        y="20"
        fill="#635BFF"
        style={{
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.04em',
        }}
      >
        stripe
      </text>
    </Box>
  );
}
