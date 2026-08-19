/**
 * Square Connect status + catalog sync result — shared by admin client and API.
 */

export type SquareConnectLocation = { id: string; name: string };

export type SquareConnectStatus = {
  connected: boolean;
  merchantId: string | null;
  locationId: string | null;
  tokenExpiresAt: string | null;
  status: string | null;
  catalogLastSyncedAt: string | null;
  catalogSyncStatus: string | null;
  catalogSyncError: string | null;
  locations: SquareConnectLocation[];
};

export type SquareOnboardResponse = {
  url: string;
  scopes: string[];
};

export type PosCatalogSyncResult = {
  cafeId: string;
  upsertedItems: number;
  softDeletedItems: number;
  upsertedGroups: number;
  lastSyncedAt: string;
};
