import type { MenuTemplateDrinkKey } from '@moonshot/types';
import { menuTemplateDrinkImageUrl } from '@moonshot/types';
import { isMenuImageStorageConfigured, readMenuImageStorageConfig } from './menu-image-storage.js';

/** Public URL for a starter template drink thumbnail, or null when storage is not configured. */
export function resolveMenuTemplateDrinkImageUrl(
  templateKey: MenuTemplateDrinkKey,
): string | null {
  if (!isMenuImageStorageConfigured()) return null;
  const config = readMenuImageStorageConfig()!;
  return menuTemplateDrinkImageUrl(templateKey, config.publicBaseUrl);
}
