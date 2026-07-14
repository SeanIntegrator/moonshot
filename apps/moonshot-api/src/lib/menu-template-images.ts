import type { MenuTemplateDrinkKey } from '@moonshot/types';
import { menuTemplateDrinkImageUrl } from '@moonshot/types';
import { isMenuImageStorageConfigured, readMenuImageStorageConfig } from './menu-image-storage.js';

/** Public URL for a canonical template drink thumbnail, or null when storage is off.
 * Prefer café-scoped copies from `copyTemplateDrinkImageToCafeItem` for menu rows.
 */
export function resolveMenuTemplateDrinkImageUrl(
  templateKey: MenuTemplateDrinkKey,
): string | null {
  if (!isMenuImageStorageConfigured()) return null;
  const config = readMenuImageStorageConfig()!;
  return menuTemplateDrinkImageUrl(templateKey, config.publicBaseUrl);
}
