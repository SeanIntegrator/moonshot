/** Barrel — existing imports from `../lib/admin-api.js` keep working. */
export { getApiBaseUrl, parseEnvelope } from './adminApi/http.js';
export {
  adminGetMe,
  adminLogin,
  type AdminMeResponse,
  type AdminSessionPayload,
} from './adminApi/auth.js';
export {
  deleteHoursOverride,
  extendCafePause,
  fetchPublicCafe,
  patchAdminSettings,
  pauseCafeOrders,
  resumeCafeOrders,
  upsertHoursOverride,
  type PublicCafePayload,
} from './adminApi/settings.js';
export {
  createMenuItem,
  createMenuSection,
  createModifierGroup,
  deleteMenuItem,
  deleteMenuSection,
  deleteModifierGroup,
  fetchDrinkArchetypes,
  fetchMenuForAdmin,
  fetchMenuForCafe,
  fetchMenuSections,
  fetchModifierGroups,
  patchMenuItem,
  patchMenuSection,
  updateModifierGroup,
  uploadMenuItemImage,
  setMenuItemUseDefaultImage,
  type DrinkArchetypeConfigPayload,
} from './adminApi/menu.js';
export { adminStripeOnboardingLink, adminStripeStatus } from './adminApi/stripe.js';
export {
  adminCompleteOnboarding,
  adminCreateKdsUser,
  adminOnboardingStatus,
  adminRegister,
  adminSaveCafeSettings,
  adminSaveMenuTemplate,
  checkSlugAvailable,
} from './adminApi/onboarding.js';
export {
  disconnectSquare,
  getSquareConnectStatus,
  importPosMenu,
  startSquareConnect,
  syncPosMenuFromSquare,
  type PosCatalogSyncResult,
  type SquareConnectLocation,
  type SquareConnectStatus,
  type SquareOnboardResponse,
} from './adminApi/pos.js';
export { fetchAdminStock, putAdminStockOption } from './adminApi/stock.js';
