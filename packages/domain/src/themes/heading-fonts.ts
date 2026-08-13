/** Curated Google Fonts for café heading overrides. Body always stays pack body. */

export type HeadingFontId =
  | 'inter'
  | 'outfit'
  | 'space-grotesk'
  | 'fraunces'
  | 'playfair-display'
  | 'dm-serif-display'
  | 'libre-baskerville'
  | 'fredoka';

export type HeadingFontEntry = {
  id: HeadingFontId;
  label: string;
  /** CSS font-family stack for headings */
  family: string;
  /** Google Fonts CSS2 stylesheet URL */
  webfontUrl: string;
};

export const HEADING_FONT_CATALOG: readonly HeadingFontEntry[] = [
  {
    id: 'inter',
    label: 'Inter',
    family: '"Inter", system-ui, sans-serif',
    webfontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap',
  },
  {
    id: 'outfit',
    label: 'Outfit',
    family: '"Outfit", system-ui, sans-serif',
    webfontUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&display=swap',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    family: '"Space Grotesk", system-ui, sans-serif',
    webfontUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap',
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    family: '"Fraunces", "Georgia", serif',
    webfontUrl:
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap',
  },
  {
    id: 'playfair-display',
    label: 'Playfair Display',
    family: '"Playfair Display", "Georgia", serif',
    webfontUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap',
  },
  {
    id: 'dm-serif-display',
    label: 'DM Serif Display',
    family: '"DM Serif Display", "Georgia", serif',
    webfontUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
  },
  {
    id: 'libre-baskerville',
    label: 'Libre Baskerville',
    family: '"Libre Baskerville", "Georgia", serif',
    webfontUrl:
      'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
  },
  {
    id: 'fredoka',
    label: 'Fredoka',
    family: '"Fredoka", system-ui, sans-serif',
    webfontUrl: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap',
  },
] as const;

const BY_ID = new Map(HEADING_FONT_CATALOG.map((e) => [e.id, e]));

export function isHeadingFontId(value: string): value is HeadingFontId {
  return BY_ID.has(value as HeadingFontId);
}

export function getHeadingFont(id: string): HeadingFontEntry | null {
  return BY_ID.get(id as HeadingFontId) ?? null;
}
