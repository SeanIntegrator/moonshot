import { z } from 'zod';

/**
 * Shape the vision model must return. Mirrors the data shapes in the
 * menu-engineering brief (per-item fields + modifiers that attach to an item
 * OR a section, plus menu-level groups like "specials" or "evening").
 *
 * This is the ONLY authoritative source for the extraction contract — the
 * prompt is derived from it (serialized into the prompt text), the orchestrator
 * parses the model's response through it, and tests pin it down. Changing a
 * field name here is a visible change everywhere.
 *
 * Design choices:
 *  - Prices are raw strings (e.g. "4.5", "4.70", "16") rather than numbers.
 *    Real café menus mix "£4.5", "4.70", "16" and we don't want silent coercion
 *    to lose a digit. The normalisation step (later) parses these into pence.
 *  - Everything optional on a per-item basis — a chalkboard rarely gives every
 *    field for every item.
 *  - `confidence` is a free-form 0..1 the model self-reports per item; useful
 *    for the confirm-table UI to highlight items the model was unsure about.
 */

export const ModifierOptionSchema = z
  .object({
    name: z.string().min(1).describe('Modifier option name as written on the menu, e.g. "oat milk", "extra shot", "add egg".'),
    priceDelta: z.string().optional().describe('Price added for this option as it appears on the menu, e.g. "+0.60", "0.95", "free". Omit if the menu shows no price.'),
  })
  .strict();

export const ModifierGroupSchema = z
  .object({
    name: z.string().min(1).describe('Group label on the menu, e.g. "Syrups", "Milk alternatives", "Add-ons", "Extras".'),
    options: z.array(ModifierOptionSchema).min(1),
    appliesTo: z
      .enum(['item', 'section', 'menu'])
      .describe('Scope. "item" when physically listed inside one item\'s description or next to it. "section" when it is a shared list for a whole menu section (e.g. one "Syrups 60p" line above all coffees). "menu" when it is a standalone add-ons block for the whole menu.'),
  })
  .strict();

export const PriceVariantSchema = z
  .object({
    label: z.string().min(1).describe('Size or variant label as written, e.g. "regular", "large", "12oz", "double".'),
    price: z.string().min(1).describe('Price as it appears on the menu for this variant.'),
  })
  .strict();

export const MenuItemSchema = z
  .object({
    name: z.string().min(1).describe('Item name as written on the menu.'),
    section: z
      .string()
      .optional()
      .describe('Section/category this item sits under on the menu, as written (e.g. "Brunch", "Coffee", "Pastries").'),
    price: z
      .string()
      .optional()
      .describe('Single price when the item has one. Use variants[] when the menu shows multiple sizes.'),
    variants: z.array(PriceVariantSchema).optional().describe('Use when the item has multiple sizes/prices on the menu.'),
    description: z.string().optional().describe('Description text that sits under the item name.'),
    dietaryCodes: z
      .array(z.string())
      .optional()
      .describe('Dietary codes exactly as written on the menu (vg, VG, V, N, GF, GFO, ngc, …). Do not normalise — the café uses what it uses and the audit flags inconsistencies.'),
    modifiers: z
      .array(ModifierGroupSchema)
      .optional()
      .describe('Modifier groups listed inline inside this item (not shared across the section).'),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Self-reported confidence 0..1 that the extracted fields for this item are accurate. Lower for handwritten/chalkboard items you had to guess at.'),
  })
  .strict();

export const MenuSectionSchema = z
  .object({
    name: z.string().min(1).describe('Section heading as written on the menu, e.g. "Brunch", "Hot drinks", "Specials".'),
    kind: z
      .enum(['food', 'drinks', 'specials', 'kids', 'evening', 'other'])
      .describe('Rough bucket. Use "specials" / "kids" / "evening" only when the menu itself clearly labels them that way.'),
    modifiers: z
      .array(ModifierGroupSchema)
      .optional()
      .describe('Modifier groups that appear at the section level (one shared list that applies to every item in this section).'),
  })
  .strict();

export const ExtractedMenuSchema = z
  .object({
    cafeName: z.string().optional().describe('Café name if visible on the menu.'),
    sections: z.array(MenuSectionSchema),
    items: z.array(MenuItemSchema),
    menuLevelModifiers: z
      .array(ModifierGroupSchema)
      .optional()
      .describe('Standalone modifier/add-on blocks that are not tied to any one section (e.g. a "Milk alternatives" block that applies across the whole menu).'),
    notes: z
      .array(z.string())
      .optional()
      .describe('Short notes about the extraction itself: anything illegible, cropped, obscured, or ambiguous. Do NOT put menu descriptions here.'),
  })
  .strict();

export type ExtractedMenu = z.infer<typeof ExtractedMenuSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuSection = z.infer<typeof MenuSectionSchema>;
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;
export type ModifierOption = z.infer<typeof ModifierOptionSchema>;
export type PriceVariant = z.infer<typeof PriceVariantSchema>;
