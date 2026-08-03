/**
 * Decide menu_items.image_url / image_source during POS catalogue upsert.
 * POS photo wins; otherwise optional shared template default by exact name match.
 */
import type { MenuItemImageSource } from '@moonshot/types';
import { menuTemplateDrinkImageUrl, resolveMenuTemplateDrinkKeyByExactName } from '@moonshot/domain';

export type ExistingMenuItemImageState = {
  imageUrl: string | null;
  imageSource: MenuItemImageSource | null;
  useDefaultImage: boolean;
};

export type ResolvedMenuItemImage = {
  /** When false, leave existing image columns unchanged on UPDATE. */
  writeImage: boolean;
  imageUrl: string | null;
  imageSource: MenuItemImageSource | null;
};

function parseImageSource(raw: string | null | undefined): MenuItemImageSource | null {
  if (raw === 'pos' || raw === 'upload' || raw === 'template') return raw;
  return null;
}

/**
 * Resolve image columns for a POS item sync/import.
 *
 * - POS-supplied URL → `pos`
 * - Café upload → never overwritten when POS has no photo
 * - Stale `pos` (POS dropped the photo) → clear, then maybe template
 * - Legacy unknown URL (null source + URL) → leave alone when POS has no photo
 * - Opted-in + exact template name + public base configured → shared template URL
 */
export function resolvePosCatalogItemImage(args: {
  posImageUrl: string | null | undefined;
  itemName: string;
  existing: ExistingMenuItemImageState | null;
  publicBaseUrl: string | null;
}): ResolvedMenuItemImage {
  const posUrl = args.posImageUrl?.trim() || null;
  if (posUrl) {
    return { writeImage: true, imageUrl: posUrl, imageSource: 'pos' };
  }

  const existingSource = args.existing?.imageSource ?? null;
  if (existingSource === 'upload') {
    return {
      writeImage: false,
      imageUrl: args.existing?.imageUrl ?? null,
      imageSource: 'upload',
    };
  }

  // Legacy untagged photo (Square CDN / café copy before image_source existed).
  if (
    args.existing &&
    existingSource == null &&
    args.existing.imageUrl != null &&
    args.existing.imageUrl !== ''
  ) {
    return {
      writeImage: false,
      imageUrl: args.existing.imageUrl,
      imageSource: null,
    };
  }

  let nextUrl: string | null = args.existing?.imageUrl ?? null;
  let nextSource: MenuItemImageSource | null = existingSource;

  if (nextSource === 'pos') {
    nextUrl = null;
    nextSource = null;
  }

  const useDefault = args.existing?.useDefaultImage !== false;
  const templateKey = resolveMenuTemplateDrinkKeyByExactName(args.itemName);
  if (useDefault && templateKey && args.publicBaseUrl) {
    return {
      writeImage: true,
      imageUrl: menuTemplateDrinkImageUrl(templateKey, args.publicBaseUrl),
      imageSource: 'template',
    };
  }

  if (nextSource === 'template') {
    return { writeImage: true, imageUrl: null, imageSource: null };
  }

  // Cleared POS with no default, or brand-new blank item.
  if (nextUrl == null && nextSource == null) {
    return { writeImage: true, imageUrl: null, imageSource: null };
  }

  return { writeImage: true, imageUrl: nextUrl, imageSource: nextSource };
}

export function parseExistingMenuItemImageState(row: {
  image_url: string | null;
  image_source: string | null;
  use_default_image: boolean;
}): ExistingMenuItemImageState {
  return {
    imageUrl: row.image_url,
    imageSource: parseImageSource(row.image_source),
    useDefaultImage: row.use_default_image !== false,
  };
}
