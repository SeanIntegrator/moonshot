import type { CatalogObject } from 'square';
import { createSquareClient, type SquareClientEnvironment } from './client.js';

export type SquareCatalogSnapshot = {
  items: CatalogObject.Item[];
  categories: CatalogObject.Category[];
  modifierLists: CatalogObject.ModifierList[];
  /** Catalog IMAGE objects — keyed later by id for item imageUrls. */
  images: CatalogObject.Image[];
  /** Square Search `latestTime` / wall clock after full list — next sync cursor. */
  latestTime: string;
};

const CATALOG_TYPES = ['ITEM', 'CATEGORY', 'MODIFIER_LIST', 'IMAGE'] as const;

function pushObject(
  obj: CatalogObject,
  bucket: {
    items: CatalogObject.Item[];
    categories: CatalogObject.Category[];
    modifierLists: CatalogObject.ModifierList[];
    images: CatalogObject.Image[];
  },
): void {
  switch (obj.type) {
    case 'ITEM':
      bucket.items.push(obj);
      break;
    case 'CATEGORY':
      bucket.categories.push(obj);
      break;
    case 'MODIFIER_LIST':
      bucket.modifierLists.push(obj);
      break;
    case 'IMAGE':
      bucket.images.push(obj);
      break;
    default:
      break;
  }
}

/**
 * Paginate Catalog.List for ITEM, CATEGORY, MODIFIER_LIST, IMAGE (initial import).
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

  const bucket = {
    items: [] as CatalogObject.Item[],
    categories: [] as CatalogObject.Category[],
    modifierLists: [] as CatalogObject.ModifierList[],
    images: [] as CatalogObject.Image[],
  };

  const page = await client.catalog.list({
    types: CATALOG_TYPES.join(','),
  });

  for await (const obj of page) {
    if (obj.isDeleted) continue;
    pushObject(obj, bucket);
  }

  return {
    ...bucket,
    latestTime: new Date().toISOString(),
  };
}

/**
 * Incremental Catalog Search since `beginTime` (exclusive).
 * Includes deleted objects so sync can soft-delete Moonshot rows.
 */
export async function searchSquareCatalogSince(opts: {
  accessToken: string;
  beginTime: string;
  environment?: SquareClientEnvironment;
}): Promise<SquareCatalogSnapshot> {
  const client = createSquareClient({
    accessToken: opts.accessToken,
    environment: opts.environment,
  });

  const bucket = {
    items: [] as CatalogObject.Item[],
    categories: [] as CatalogObject.Category[],
    modifierLists: [] as CatalogObject.ModifierList[],
    images: [] as CatalogObject.Image[],
  };

  let cursor: string | undefined;
  let latestTime = opts.beginTime;

  do {
    const res = await client.catalog.search({
      objectTypes: [...CATALOG_TYPES],
      includeDeletedObjects: true,
      beginTime: opts.beginTime,
      cursor,
      limit: 100,
    });

    for (const obj of res.objects ?? []) {
      pushObject(obj, bucket);
    }
    for (const obj of res.relatedObjects ?? []) {
      pushObject(obj, bucket);
    }

    if (res.latestTime && res.latestTime > latestTime) {
      latestTime = res.latestTime;
    }
    cursor = res.cursor;
  } while (cursor);

  if (latestTime === opts.beginTime) {
    latestTime = new Date().toISOString();
  }

  return { ...bucket, latestTime };
}
