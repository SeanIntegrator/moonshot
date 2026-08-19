import type { BaseThemeId, Cafe, CafeBrandOverrides } from '@moonshot/types';
import { HEADING_FONT_CATALOG, isHexColor, normalizeHex } from '@moonshot/domain';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { OrderAheadThemePreview } from './OrderAheadThemePreview.js';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { useCafeSave } from '../../primitives/useCafePatch.js';
import { fieldErrorProps } from '../../primitives/ValidationMessage.js';
import { BRAND_COLOUR_PRESETS, THEME_PACKS } from './brand-presets.js';

type PreviewFrame = 'home' | 'prompt';

function brandFromCafe(cafe: Cafe): {
  themeId: BaseThemeId;
  color: string;
  headingFontId: string;
} {
  const brand = cafe.themeOverrides?.brand;
  return {
    themeId: cafe.themeId,
    color: typeof brand?.color === 'string' ? brand.color : '',
    headingFontId: typeof brand?.headingFontId === 'string' ? brand.headingFontId : '',
  };
}

function sameHex(a: string, b: string): boolean {
  const na = a.trim() ? normalizeHex(a) : '';
  const nb = b.trim() ? normalizeHex(b) : '';
  return (na ?? a.trim().toLowerCase()) === (nb ?? b.trim().toLowerCase());
}

export function BrandEditorCard() {
  const { cafe } = useCafe();
  const saved = brandFromCafe(cafe);
  const [themeId, setThemeId] = useState<BaseThemeId>(saved.themeId);
  const [color, setColor] = useState(saved.color);
  const [headingFontId, setHeadingFontId] = useState(saved.headingFontId);
  const [previewFrame, setPreviewFrame] = useState<PreviewFrame>('home');
  const { saving, save: savePatch } = useCafeSave('Save failed');

  useEffect(() => {
    const next = brandFromCafe(cafe);
    setThemeId(next.themeId);
    setColor(next.color);
    setHeadingFontId(next.headingFontId);
  }, [cafe]);

  const dirty =
    themeId !== saved.themeId ||
    !sameHex(color, saved.color) ||
    headingFontId !== saved.headingFontId;

  const colourError =
    color.trim() && !isHexColor(color) ? 'Enter a #hex colour, or Reset.' : null;
  const valid = colourError === null;

  const previewColor = color.trim() && isHexColor(color) ? color.trim() : null;
  const previewFont = headingFontId.trim() || null;

  function undo() {
    setThemeId(saved.themeId);
    setColor(saved.color);
    setHeadingFontId(saved.headingFontId);
  }

  async function save() {
    if (!valid) return;
    const brand: CafeBrandOverrides = {
      color: color.trim() ? color.trim() : null,
      headingFontId: headingFontId.trim() ? headingFontId.trim() : null,
    };
    await savePatch({ themeId, brand });
  }

  return (
    <SettingsCard
      title="Look"
      description="Pick a base look, then your colour and heading font. Body text stays as it is so the menu is always easy to read."
      save={{
        label: 'Save look',
        dirty,
        valid,
        saving,
        onSave: () => void save(),
        secondaryLabel: 'Undo',
        onSecondary: undo,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Pack
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {THEME_PACKS.map((pack) => {
              const selected = themeId === pack.id;
              const inUse = saved.themeId === pack.id;
              return (
                <Box
                  key={pack.id}
                  component="button"
                  type="button"
                  onClick={() => setThemeId(pack.id)}
                  sx={(theme) => ({
                    textAlign: 'left',
                    p: 1.5,
                    border: `1px solid ${selected ? theme.console.ink : theme.console.card.border}`,
                    borderRadius: 1,
                    bgcolor: selected ? theme.console.readonly.fill : 'transparent',
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                  })}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{pack.label}</Typography>
                    {inUse ? (
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        in use
                      </Typography>
                    ) : null}
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
                    {pack.blurb}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1 }}>
            Colour
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {BRAND_COLOUR_PRESETS.map((hex) => {
              const active = sameHex(color, hex);
              return (
                <Box
                  key={hex}
                  component="button"
                  type="button"
                  aria-label={hex}
                  aria-pressed={active}
                  onClick={() => setColor(hex)}
                  sx={(theme) => ({
                    width: 32,
                    height: 32,
                    p: 0,
                    borderRadius: '50%',
                    bgcolor: hex,
                    border: `2px solid ${active ? theme.console.ink : '#fff'}`,
                    boxShadow: `0 0 0 1px ${theme.console.card.border}`,
                    cursor: 'pointer',
                  })}
                />
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1.5 }}>
            <Box
              component="input"
              type="color"
              aria-label="Brand colour picker"
              value={previewColor ?? '#396a5b'}
              onChange={(e) => setColor(e.currentTarget.value)}
              sx={(theme) => ({
                width: 44,
                height: 40,
                p: 0,
                border: `1px solid ${theme.console.card.border}`,
                borderRadius: 1,
                bgcolor: 'transparent',
                cursor: 'pointer',
              })}
            />
            <TextField
              label="Hex"
              size="small"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#396a5b"
              sx={{ width: 140 }}
              {...fieldErrorProps(colourError)}
            />
            <Button
              size="small"
              color="inherit"
              onClick={() => setColor('')}
              disabled={!color.trim()}
              sx={{ mt: 0.5 }}
            >
              Reset
            </Button>
          </Box>

          <FormControl size="small" sx={{ mt: 2.5, maxWidth: 320 }} fullWidth>
            <InputLabel id="heading-font-label">Heading font</InputLabel>
            <Select
              labelId="heading-font-label"
              label="Heading font"
              value={headingFontId}
              onChange={(e) => setHeadingFontId(String(e.target.value))}
            >
              <MenuItem value="">
                <em>Pack default</em>
              </MenuItem>
              {HEADING_FONT_CATALOG.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>
            Customers see this the next time they open the app.
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">Preview</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={previewFrame}
              onChange={(_, v: PreviewFrame | null) => {
                if (v) setPreviewFrame(v);
              }}
            >
              <ToggleButton value="home">Home</ToggleButton>
              <ToggleButton value="prompt">Prompt</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <OrderAheadThemePreview
            themeId={themeId}
            brandColor={previewColor}
            headingFontId={previewFont}
            variant={previewFrame}
          />
        </Box>
      </Box>
    </SettingsCard>
  );
}
