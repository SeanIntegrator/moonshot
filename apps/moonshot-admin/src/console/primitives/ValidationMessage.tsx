import { Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ValidationMessage({ children }: Props) {
  return (
    <Typography
      role="alert"
      sx={(theme) => ({
        mt: 0.5,
        fontSize: 12,
        color: theme.console.stock.out,
      })}
    >
      {children}
    </Typography>
  );
}

export function fieldErrorProps(message: string | null | undefined): {
  error: boolean;
  helperText: string | undefined;
} {
  const has = Boolean(message);
  return { error: has, helperText: has ? message! : undefined };
}
