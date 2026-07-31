import type { CatalogObject } from 'square';
import { createSquareClient, type SquareClientEnvironment } from './client.js';

export type SquareCatalogSnapshot = {
  items: CatalogObject.Item[];
  categories: CatalogObject.Category[];
  modifierLists: CatalogObject.ModifierList[];
};

/**
 * Paginate Catalog.List for ITEM, CATEGORY, and MODIFIER_LIST.
 * Variations and modifiers are nested on their parents when listing those types.
 */
export async function fetchSquareCatalog(opts: {
  accessToken: string;
  environment?: SquareClientEnvironment;
}): Promise<SquareCatalogSnapshot> {
  const client = createSquareClient({
    accessToken: opts.accessToken,
    environment: opts.environment,
  });

  const items: CatalogObject.Item[] = [];
  const categories: CatalogObject.Category[] = [];
  const modifierLists: CatalogObject.ModifierList[] = [];

  const page = await client.catalog.list({
    types: 'ITEM,CATEGORY,MODIFIER_LIST',
  });

  for await (const obj of page) {
    if (obj.isDeleted) continue;
    switch (obj.type) {
      case 'ITEM':
        items.push(obj);
        break;
      case 'CATEGORY':
        categories.push(obj);
        break;
      case 'MODIFIER_LIST':
        modifierLists.push(obj);
        break;
      default:
        break;
    }
  }

  return { items, categories, modifierLists };
}
