import type { BaseThemeId, Cafe, CafeBrandOverrides } from '@moonshot/types';
import { HEADING_FONT_CATALOG, isBaseThemeId } from '@moonshot/domain';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState, type ChangeEvent } from 'react';
import { patchAdminSettings } from '../lib/admin-api.js';
import { OrderAheadThemePreview } from './branding/OrderAheadThemePreview.js';

type Props = {
  cafe: Cafe;
  token: string;
  onCafeUpdated: (c: Cafe) => void;
};

const PACK_OPTIONS: { id: BaseThemeId; label: string; blurb: string }[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    blurb: 'White & black, sharp edges, clinical',
  },
  {
    id: 'organic',
    label: 'Organic',
    blurb: 'Warm wood & clay, rounder edges, serif headings',
  },
  {
    id: 'lively',
    label: 'Lively',
    blurb: 'Bright contrast, bubble headings, soft cards',
  },
];

function brandFromCafe(cafe: Cafe): { color: string; headingFontId: string } {
  const brand = cafe.themeOverrides?.brand;
  return {
    color: typeof brand?.color === 'string' ? brand.color : '',
    headingFontId:
      typeof brand?.headingFontId === 'string' ? brand.headingFontId : '',
  };
}

export function BrandingSettingsCard({ cafe, token, onCafeUpdated }: Props) {
  const initialBrand = brandFromCafe(cafe);
  const [themeId, setThemeId] = useState<BaseThemeId>(
    isBaseThemeId(cafe.themeId) ? cafe.themeId : 'organic',
  );
  const [color, setColor] = useState(initialBrand.color);
  const [headingFontId, setHeadingFontId] = useState(initialBrand.headingFontId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setThemeId(isBaseThemeId(cafe.themeId) ? cafe.themeId : 'organic');
    const b = brandFromCafe(cafe);
    setColor(b.color);
    setHeadingFontId(b.headingFontId);
  }, [cafe]);

  const previewColor = color.trim() || null;
  const previewFont = headingFontId.trim() || null;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const brand: CafeBrandOverrides = {
        color: color.trim() ? color.trim() : null,
        headingFontId: headingFontId.trim() ? headingFontId.trim() : null,
      };
      const data = await patchAdminSettings(token, {
        themeId,
        brand,
      });
      onCafeUpdated(data.cafe);
      setMessage({ type: 'ok', text: 'Branding saved.' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Branding
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Pick a base look, then optionally set a brand colour (primary actions + related surfaces)
        and a heading font. Body text always stays readable.
      </Typography>
      {message && (
        <Alert
          severity={message.type === 'ok' ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          alignItems: { md: 'flex-start' },
        }}
      >
        <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
              Theme pack
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={themeId}
              onChange={(_, v: BaseThemeId | null) => {
                if (v) setThemeId(v);
              }}
              disabled={saving}
              orientation="vertical"
              sx={{
                gap: 1,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 1,
                  textTransform: 'none',
                },
              }}
            >
              {PACK_OPTIONS.map((p) => (
                <ToggleButton key={p.id} value={p.id}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{p.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {p.blurb}
                    </Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                Brand colour
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box
                  component="input"
                  type="color"
                  value={color.trim() && /^#[0-9a-fA-F]{6}$/.test(color.trim()) ? color.trim() : '#6b4f3a'}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  disabled={saving}
                  aria-label="Brand colour picker"
                  sx={{
                    width: 44,
                    height: 40,
                    p: 0,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'transparent',
                    cursor: saving ? 'default' : 'pointer',
                  }}
                />
                <TextField
                  label="Hex"
                  size="small"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={saving}
                  placeholder="#6b4f3a"
                  sx={{ width: 140 }}
                />
                <Button
                  size="small"
                  onClick={() => setColor('')}
                  disabled={saving || !color}
                  color="inherit"
                >
                  Clear
                </Button>
              </Stack>
            </Box>
          </Stack>

          <FormControl size="small" sx={{ maxWidth: 320 }} disabled={saving}>
            <InputLabel id="heading-font-label">Heading font</InputLabel>
            <Select
              labelId="heading-font-label"
              label="Heading font"
              value={headingFontId || ''}
              onChange={(e) => setHeadingFontId(String(e.target.value))}
            >
              <MenuItem value="">
                <em>Theme default</em>
              </MenuItem>
              {HEADING_FONT_CATALOG.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Button variant="contained" size="small" onClick={() => void save()} disabled={saving}>
              Save branding
            </Button>
          </Box>
        </Stack>

        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
            Live preview
          </Typography>
          <OrderAheadThemePreview
            themeId={themeId}
            brandColor={previewColor}
            headingFontId={previewFont}
          />
        </Box>
      </Box>
    </Paper>
  );
}
