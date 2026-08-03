/** Re-export shared slug rules from `@moonshot/domain` so API routes keep stable import paths. */
export {
  RESERVED_CAFE_SLUGS,
  deriveCafeSlugFromName,
  normalizeCafeSlugInput,
  slugifyCafeName,
  validateCafeSlug,
  type SlugValidationResult,
} from '@moonshot/domain';
