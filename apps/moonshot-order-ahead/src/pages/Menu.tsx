import type { NormalisedMenu } from '@moonshot/types';
import { Container, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { Fragment, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

export function Menu() {
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<NormalisedMenu>('/menu');
        setMenu(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load menu');
      }
    })();
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
      <Typography variant="h4" component="h1" sx={{ mt: 0 }}>
        Menu
      </Typography>
      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      {!menu && !error && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Loading…
        </Typography>
      )}
      {menu && (
        <List disablePadding sx={{ mt: 1 }}>
          {menu.items.map((item) => (
            <Fragment key={item.id}>
              <ListItem alignItems="flex-start" disableGutters sx={{ py: 1.5 }}>
                <ListItemText
                  primary={item.name}
                  secondary={item.category.replace(/_/g, ' ')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                />
                <Typography variant="body1" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, ml: 2 }}>
                  £{(item.priceMinor / 100).toFixed(2)}
                </Typography>
              </ListItem>
              <Divider component="li" />
            </Fragment>
          ))}
        </List>
      )}
    </Container>
  );
}
