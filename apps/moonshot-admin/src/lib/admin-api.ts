/** Barrel — existing imports from `../lib/admin-api.js` keep working. */
export { getApiBaseUrl, parseEnvelope } from './adminApi/http.js';
export {
  adminGetMe,
  adminLogin,
  type AdminMeResponse,
  type AdminSessionPayload,
} from './adminApi/auth.js';
export {
  fetchPublicCafe,
  patchAdminSettings,
  type PublicCafePayload,
} from './adminApi/settings.js';
export {
  applyDrinkArchetypeToItems,
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
  patchDrinkArchetypes,
  patchMenuItem,
  patchMenuSection,
  updateModifierGroup,
  uploadMenuItemImage,
  type DrinkArchetypeConfigPayload,
} from './adminApi/menu.js';
export { adminStripeOnboardingLink, adminStripeStatus } from './adminApi/stripe.js';
export {
  adminCompleteOnboarding,
  adminCreateKdsUser,
  adminOnboardingStatus,
  adminRegister,
  adminSaveMenuTemplate,
  checkSlugAvailable,
} from './adminApi/onboarding.js';
export {
  getSquareConnectStatus,
  importPosMenu,
  startSquareConnect,
  type SquareConnectLocation,
  type SquareConnectStatus,
  type SquareOnboardResponse,
} from './adminApi/pos.js';
