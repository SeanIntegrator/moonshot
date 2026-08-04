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
const BATCH_GET_CHUNK = 100;
/** Max ancestor walks when filling missing parent categories. */
const CATEGORY_PARENT_WALK_DEPTH = 5;

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
 * Collect Square category ids referenced by items (reportingCategory → categories[] → legacy).
 */
export function collectReferencedCategoryIds(items: CatalogObject.Item[]): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.isDeleted) continue;
    const data = item.itemData;
    if (!data) continue;
    const candidates: Array<string | null | undefined> = [
      data.reportingCategory?.id,
      ...(data.categories ?? []).map((c) => c?.id),
      data.categoryId,
    ];
    for (const id of candidates) {
      if (id?.trim()) ids.add(id.trim());
    }
  }
  return [...ids];
}

function categoryAncestorIds(cat: CatalogObject.Category): string[] {
  const out: string[] = [];
  const parent = cat.categoryData?.parentCategory;
  if (parent && typeof parent === 'object' && 'id' in parent) {
    const id = (parent as { id?: string | null }).id;
    if (id?.trim()) out.push(id.trim());
  }
  for (const node of cat.categoryData?.pathToRoot ?? []) {
    if (node.categoryId?.trim()) out.push(node.categoryId.trim());
  }
  return out;
}

/**
 * BatchRetrieve CATEGORY objects referenced by items but missing from an incremental
 * snapshot, walking parents via parentCategory / pathToRoot so the section tree can
 * be built for brand-new leaves (e.g. Savory never previously upserted).
 */
export async function enrichSnapshotWithMissingCategories(
  snapshot: SquareCatalogSnapshot,
  opts: { accessToken: string; environment?: SquareClientEnvironment },
): Promise<SquareCatalogSnapshot> {
  const known = new Set(
    snapshot.categories.map((c) => c.id).filter((id): id is string => Boolean(id)),
  );
  let pending = collectReferencedCategoryIds(snapshot.items).filter((id) => !known.has(id));
  if (pending.length === 0) return snapshot;

  const client = createSquareClient({
    accessToken: opts.accessToken,
    environment: opts.environment,
  });

  const categories = [...snapshot.categories];
  for (let depth = 0; depth < CATEGORY_PARENT_WALK_DEPTH && pending.length > 0; depth++) {
    const nextPending: string[] = [];
    for (let i = 0; i < pending.length; i += BATCH_GET_CHUNK) {
      const chunk = pending.slice(i, i + BATCH_GET_CHUNK);
      const res = await client.catalog.batchGet({
        objectIds: chunk,
        includeRelatedObjects: true,
        includeCategoryPathToRoot: true,
      });
      for (const obj of [...(res.objects ?? []), ...(res.relatedObjects ?? [])]) {
        if (obj.type !== 'CATEGORY' || !obj.id || known.has(obj.id)) continue;
        categories.push(obj);
        known.add(obj.id);
        for (const ancestorId of categoryAncestorIds(obj)) {
          if (!known.has(ancestorId)) nextPending.push(ancestorId);
        }
      }
    }
    pending = [...new Set(nextPending)];
  }

  return { ...snapshot, categories };
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
