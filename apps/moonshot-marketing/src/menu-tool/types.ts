/**
 * Mirror of `ExtractedMenu` from apps/moonshot-api/src/lib/menu-engineering.
 * The Zod schema there is the source of truth; this is a hand-written
 * TypeScript twin so the marketing app does not need Zod as a dependency.
 *
 * Keep in sync by eye — tests on the API side guard the real shape.
 */

export type ModifierScope = 'item' | 'section' | 'menu';

export interface ModifierOption {
  name: string;
  priceDelta?: string;
}

export interface ModifierGroup {
  name: string;
  options: ModifierOption[];
  appliesTo: ModifierScope;
}

export interface PriceVariant {
  label: string;
  price: string;
}

export interface MenuItem {
  name: string;
  section?: string;
  price?: string;
  variants?: PriceVariant[];
  description?: string;
  dietaryCodes?: string[];
  modifiers?: ModifierGroup[];
  confidence?: number;
}

export type MenuSectionKind = 'food' | 'drinks' | 'specials' | 'kids' | 'evening' | 'other';

export interface MenuSection {
  name: string;
  kind: MenuSectionKind;
  modifiers?: ModifierGroup[];
}

export interface ExtractedMenu {
  cafeName?: string;
  sections: MenuSection[];
  items: MenuItem[];
  menuLevelModifiers?: ModifierGroup[];
  notes?: string[];
}

export interface ExtractResponse {
  ok: true;
  data: {
    menu: ExtractedMenu;
    meta: { pageCount: number };
  };
}

export interface ExtractErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

export const SECTION_KINDS: MenuSectionKind[] = [
  'food',
  'drinks',
  'specials',
  'kids',
  'evening',
  'other',
];
