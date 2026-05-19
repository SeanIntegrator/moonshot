import type { AdminSettingsResponse, Cafe, PosProvider } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { activeFeatureKeys, mapCafeRow } from './cafe-map.js';
import { CAFE_COLUMNS, findCafeById } from './cafes-repository.js';
import {
  mergeCafeFeatures,
  mergeKdsConfigSection,
  parseAdminSettingsPatchBody,
} from './admin-settings-merge.js';
import { ApiHttpError } from './http-errors.js';

export type AdminSettingsPatchInput = ReturnType<typeof parseAdminSettingsPatchBody>;

/**
 * Merge feature + KDS config patches and persist on the café row.
 * Throws {@link ApiHttpError} for validation / not-found cases.
 */
export async function patchAdminCafeSettings(
  cafeId: string,
  body: unknown,
): Promise<AdminSettingsResponse> {
  const parsed = parseAdminSettingsPatchBody(body);
  if (!parsed.featuresPatch && !parsed.kdsConfigPatch) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'featuresPatch or kdsConfigPatch is required',
    );
  }

  const resolved = await findCafeById(cafeId);
  if (!resolved) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }

  let nextFeatures = resolved.features;
  let nextKds = resolved.kdsConfig;

  if (parsed.featuresPatch) {
    const merged = mergeCafeFeatures(resolved.features, parsed.featuresPatch);
    if (!merged.ok) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, merged.error);
    }
    nextFeatures = merged.value;
  }

  if (parsed.kdsConfigPatch) {
    const merged = mergeKdsConfigSection(resolved.kdsConfig, parsed.kdsConfigPatch);
    if (!merged.ok) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, merged.error);
    }
    nextKds = merged.value;
  }

  const { rows } = await pool.query(
    `UPDATE cafes
     SET features = $1::jsonb, kds_config = $2::jsonb
     WHERE id = $3
     RETURNING ${CAFE_COLUMNS}`,
    [JSON.stringify(nextFeatures), JSON.stringify(nextKds), cafeId],
  );

  const out = mapCafeRow(rows[0] as Parameters<typeof mapCafeRow>[0]);
  const cafe: Cafe = {
    id: out.cafeId,
    name: out.name,
    slug: out.slug,
    posProvider: out.posProvider as PosProvider,
    paymentProvider: out.paymentProvider,
    features: out.features,
    themeId: out.themeId,
    themeOverrides: out.themeOverrides,
    kdsConfig: out.kdsConfig,
    timezone: out.timezone,
    ownerFeedbackEmail: out.ownerFeedbackEmail,
  };

  return {
    cafe,
    activeFeatures: activeFeatureKeys(out.features),
  };
}
