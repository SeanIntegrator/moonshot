import type {
  AdminFeaturesPatch,
  AdminKdsConfigPatch,
  AdminSettingsPatchBody,
  CafeFeatures,
  CafeHours,
  KdsConfig,
  KdsSoundId,
  LoyaltyFeatureConfig,
  OrderAheadFeatureConfig,
  ReviewNudgeFeatureConfig,
} from '@moonshot/types';
import { WEEKDAY_KEYS } from '@moonshot/types';
import {
  hhMmToMinutes,
  isKdsSoundId,
  normalizeCafeHours,
  resolveReviewUrl,
  toHhMm,
} from '@moonshot/domain';

const DEFAULT_LOYALTY: LoyaltyFeatureConfig = {
  enabled: true,
  stampsPerReward: 10,
  rewardDescription: 'Free drink',
  doubleStampDays: [],
};

const DEFAULT_ORDER_AHEAD: OrderAheadFeatureConfig = {
  enabled: true,
  paymentProvider: 'stripe',
  pickupTimeEnabled: true,
  defaultPickupMinutes: 10,
  maxPickupMinutes: 60,
  notesEnabled: true,
};

const DEFAULT_REVIEW_NUDGE: ReviewNudgeFeatureConfig = {
  enabled: false,
  reviewUrl: null,
  googlePlaceId: null,
};

const KDS_GROUP_BY = new Set(['order_type', 'none']);

export type MergeResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function mergeCafeFeatures(
  existing: CafeFeatures,
  patch: AdminFeaturesPatch | undefined,
): MergeResult<CafeFeatures> {
  if (!patch) {
    return { ok: true, value: existing };
  }

  let next: CafeFeatures = { ...existing };

  if (Object.prototype.hasOwnProperty.call(patch, 'loyalty')) {
    if (patch.loyalty === null) {
      next = { ...next, loyalty: null };
    } else if (patch.loyalty && Object.keys(patch.loyalty).length > 0) {
      const base = existing.loyalty ?? DEFAULT_LOYALTY;
      const merged: LoyaltyFeatureConfig = { ...base, ...patch.loyalty };
      const v = validateLoyalty(merged);
      if (!v.ok) return v;
      next = { ...next, loyalty: v.value };
    }
  }

  if (patch.order_ahead !== undefined && Object.keys(patch.order_ahead).length > 0) {
    const base = existing.order_ahead ?? DEFAULT_ORDER_AHEAD;
    const merged: OrderAheadFeatureConfig = { ...base, ...patch.order_ahead };
    const v = validateOrderAhead(merged);
    if (!v.ok) return v;
    next = { ...next, order_ahead: v.value };
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'review_nudge')) {
    if (patch.review_nudge === null) {
      next = { ...next, review_nudge: null };
    } else if (patch.review_nudge && Object.keys(patch.review_nudge).length > 0) {
      const base = existing.review_nudge ?? DEFAULT_REVIEW_NUDGE;
      const merged: ReviewNudgeFeatureConfig = { ...base, ...patch.review_nudge };
      const v = validateReviewNudge(merged);
      if (!v.ok) return v;
      next = { ...next, review_nudge: v.value };
    }
  }

  return { ok: true, value: next };
}

function validateLoyalty(merged: LoyaltyFeatureConfig): MergeResult<LoyaltyFeatureConfig> {
  if (merged.enabled) {
    const s = merged.stampsPerReward;
    if (!Number.isInteger(s) || s < 1 || s > 50) {
      return {
        ok: false,
        error: 'stampsPerReward must be an integer between 1 and 50 when loyalty is enabled',
      };
    }
  }
  if (!Array.isArray(merged.doubleStampDays)) {
    return { ok: false, error: 'doubleStampDays must be an array' };
  }
  if (typeof merged.rewardDescription !== 'string') {
    return { ok: false, error: 'rewardDescription must be a string' };
  }
  return { ok: true, value: merged };
}

function validateOrderAhead(merged: OrderAheadFeatureConfig): MergeResult<OrderAheadFeatureConfig> {
  const d = merged.defaultPickupMinutes;
  const m = merged.maxPickupMinutes;
  if (!Number.isInteger(d) || d < 1 || d > 24 * 60) {
    return { ok: false, error: 'defaultPickupMinutes must be a positive integer (minutes)' };
  }
  if (!Number.isInteger(m) || m < 1 || m > 24 * 60) {
    return { ok: false, error: 'maxPickupMinutes must be a positive integer (minutes)' };
  }
  if (d > m) {
    return {
      ok: false,
      error: 'defaultPickupMinutes must be less than or equal to maxPickupMinutes',
    };
  }
  return { ok: true, value: merged };
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateReviewNudge(
  merged: ReviewNudgeFeatureConfig,
): MergeResult<ReviewNudgeFeatureConfig> {
  if (typeof merged.enabled !== 'boolean') {
    return { ok: false, error: 'review_nudge.enabled must be a boolean' };
  }

  let reviewUrl: string | null = null;
  if (merged.reviewUrl !== undefined && merged.reviewUrl !== null) {
    if (typeof merged.reviewUrl !== 'string') {
      return { ok: false, error: 'reviewUrl must be a string or null' };
    }
    const trimmed = merged.reviewUrl.trim();
    if (trimmed.length === 0) {
      reviewUrl = null;
    } else if (!isHttpUrl(trimmed)) {
      return { ok: false, error: 'reviewUrl must be an http(s) URL' };
    } else {
      reviewUrl = trimmed;
    }
  }

  let googlePlaceId: string | null | undefined = merged.googlePlaceId;
  if (googlePlaceId !== undefined && googlePlaceId !== null) {
    if (typeof googlePlaceId !== 'string') {
      return { ok: false, error: 'googlePlaceId must be a string or null' };
    }
    const trimmed = googlePlaceId.trim();
    googlePlaceId = trimmed.length > 0 ? trimmed : null;
  }

  const normalised: ReviewNudgeFeatureConfig = {
    enabled: merged.enabled,
    reviewUrl,
    ...(googlePlaceId !== undefined ? { googlePlaceId } : {}),
  };

  if (normalised.enabled && !resolveReviewUrl(normalised)) {
    return {
      ok: false,
      error: 'reviewUrl (or legacy googlePlaceId) is required when review nudge is enabled',
    };
  }

  return { ok: true, value: normalised };
}

export function mergeKdsConfigSection(
  existing: KdsConfig,
  patch: AdminKdsConfigPatch | undefined,
): MergeResult<KdsConfig> {
  if (!patch) {
    return { ok: true, value: existing };
  }

  const next: KdsConfig = {
    ...existing,
    layout: { ...existing.layout },
    display: { ...existing.display },
    eta: { ...existing.eta },
    timerThresholds: { ...existing.timerThresholds },
    audio: { ...existing.audio },
    modifierClassification: existing.modifierClassification,
    milkColors: { ...existing.milkColors },
    beanBadges: {
      ...existing.beanBadges,
      custom: [...existing.beanBadges.custom],
    },
  };

  if (patch.layout) {
    if (patch.layout.columns !== undefined) {
      const c = patch.layout.columns;
      if (!Number.isInteger(c) || c < 1 || c > 6) {
        return { ok: false, error: 'layout.columns must be an integer from 1 to 6' };
      }
      next.layout.columns = c;
    }
    if (patch.layout.groupBy !== undefined) {
      if (!KDS_GROUP_BY.has(patch.layout.groupBy)) {
        return { ok: false, error: 'layout.groupBy must be order_type or none' };
      }
      next.layout.groupBy = patch.layout.groupBy;
    }
  }

  if (patch.display) {
    const keys = ['showCustomerNameInHeader', 'showPickupTime', 'showOrderSource'] as const;
    for (const k of keys) {
      if (patch.display[k] !== undefined) {
        const v = patch.display[k];
        if (typeof v !== 'boolean') {
          return { ok: false, error: `${k} must be a boolean` };
        }
        next.display[k] = v;
      }
    }
  }

  if (patch.eta) {
    if (patch.eta.basePrepMinutes !== undefined) {
      const x = patch.eta.basePrepMinutes;
      if (!Number.isInteger(x) || x < 1 || x > 120) {
        return { ok: false, error: 'eta.basePrepMinutes must be an integer from 1 to 120' };
      }
      next.eta.basePrepMinutes = x;
    }
    if (patch.eta.perItemMinutes !== undefined) {
      const x = patch.eta.perItemMinutes;
      if (!Number.isInteger(x) || x < 0 || x > 30) {
        return { ok: false, error: 'eta.perItemMinutes must be an integer from 0 to 30' };
      }
      next.eta.perItemMinutes = x;
    }
  }

  if (patch.timerThresholds) {
    if (patch.timerThresholds.greenMax !== undefined) {
      const x = patch.timerThresholds.greenMax;
      if (!Number.isInteger(x) || x < 1 || x > 60) {
        return { ok: false, error: 'timerThresholds.greenMax must be an integer from 1 to 60' };
      }
      next.timerThresholds.greenMax = x;
    }
    if (patch.timerThresholds.amberMax !== undefined) {
      const x = patch.timerThresholds.amberMax;
      if (!Number.isInteger(x) || x < 1 || x > 120) {
        return { ok: false, error: 'timerThresholds.amberMax must be an integer from 1 to 120' };
      }
      next.timerThresholds.amberMax = x;
    }
    if (next.timerThresholds.greenMax >= next.timerThresholds.amberMax) {
      return {
        ok: false,
        error: 'timerThresholds.greenMax must be less than timerThresholds.amberMax',
      };
    }
  }

  if (patch.audio) {
    if (patch.audio.enabled !== undefined) {
      if (typeof patch.audio.enabled !== 'boolean') {
        return { ok: false, error: 'audio.enabled must be a boolean' };
      }
      next.audio.enabled = patch.audio.enabled;
    }
    if (patch.audio.volume !== undefined) {
      const v = patch.audio.volume;
      if (!Number.isInteger(v) || v < 0 || v > 100) {
        return { ok: false, error: 'audio.volume must be an integer from 0 to 100' };
      }
      next.audio.volume = v;
    }
    if (patch.audio.overdueRepeatSeconds !== undefined) {
      const r = patch.audio.overdueRepeatSeconds;
      if (!Number.isInteger(r) || r < 0 || r > 600) {
        return { ok: false, error: 'audio.overdueRepeatSeconds must be an integer from 0 to 600' };
      }
      next.audio.overdueRepeatSeconds = r;
    }
    if (patch.audio.newOrderSound !== undefined) {
      const parsed = parseSoundId(patch.audio.newOrderSound, 'audio.newOrderSound');
      if (!parsed.ok) return parsed;
      next.audio.newOrderSound = parsed.value;
    }
    if (patch.audio.overdueSound !== undefined) {
      const parsed = parseSoundId(patch.audio.overdueSound, 'audio.overdueSound');
      if (!parsed.ok) return parsed;
      next.audio.overdueSound = parsed.value;
    }
  }

  return { ok: true, value: next };
}

function parseSoundId(value: unknown, field: string): MergeResult<KdsSoundId | null> {
  if (value === null) return { ok: true, value: null };
  if (!isKdsSoundId(value)) {
    return { ok: false, error: `${field} must be a known sound id or null` };
  }
  return { ok: true, value };
}

export function validateCafeHoursPatch(raw: unknown): MergeResult<CafeHours> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'hours must be an object keyed by weekday' };
  }
  const rec = raw as Record<string, unknown>;
  for (const day of WEEKDAY_KEYS) {
    if (!(day in rec)) {
      return { ok: false, error: `hours.${day} is required` };
    }
    const intervals = rec[day];
    if (!Array.isArray(intervals)) {
      return { ok: false, error: `hours.${day} must be an array` };
    }
    for (const item of intervals) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { ok: false, error: `hours.${day} intervals must be objects` };
      }
      const open = (item as { open?: unknown }).open;
      const close = (item as { close?: unknown }).close;
      if (typeof open !== 'string' || typeof close !== 'string') {
        return { ok: false, error: `hours.${day} intervals need open/close as HH:mm` };
      }
      const openNorm = toHhMm(open);
      const closeNorm = toHhMm(close);
      if (!openNorm || !closeNorm) {
        return { ok: false, error: `hours.${day} intervals need open/close as HH:mm` };
      }
      if (hhMmToMinutes(openNorm)! >= hhMmToMinutes(closeNorm)!) {
        return { ok: false, error: `hours.${day} open must be before close` };
      }
    }
  }
  return { ok: true, value: normalizeCafeHours(raw) };
}

/** Accept only whitelisted keys from the wire (ignore unknown fields). */
export function parseAdminSettingsPatchBody(body: unknown): AdminSettingsPatchBody {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }
  const b = body as Record<string, unknown>;
  const out: AdminSettingsPatchBody = {};

  if (
    b.featuresPatch !== undefined &&
    b.featuresPatch !== null &&
    typeof b.featuresPatch === 'object' &&
    !Array.isArray(b.featuresPatch)
  ) {
    const fp = b.featuresPatch as Record<string, unknown>;
    const featuresPatch: AdminFeaturesPatch = {};
    if (Object.prototype.hasOwnProperty.call(fp, 'loyalty')) {
      if (fp.loyalty === null) {
        featuresPatch.loyalty = null;
      } else if (typeof fp.loyalty === 'object' && !Array.isArray(fp.loyalty)) {
        featuresPatch.loyalty = fp.loyalty as Partial<LoyaltyFeatureConfig>;
      }
    }
    if (
      fp.order_ahead !== undefined &&
      fp.order_ahead !== null &&
      typeof fp.order_ahead === 'object' &&
      !Array.isArray(fp.order_ahead)
    ) {
      featuresPatch.order_ahead = fp.order_ahead as Partial<OrderAheadFeatureConfig>;
    }
    if (Object.prototype.hasOwnProperty.call(fp, 'review_nudge')) {
      if (fp.review_nudge === null) {
        featuresPatch.review_nudge = null;
      } else if (typeof fp.review_nudge === 'object' && !Array.isArray(fp.review_nudge)) {
        featuresPatch.review_nudge = fp.review_nudge as Partial<ReviewNudgeFeatureConfig>;
      }
    }
    if (Object.keys(featuresPatch).length > 0) {
      out.featuresPatch = featuresPatch;
    }
  }

  if (
    b.kdsConfigPatch !== undefined &&
    b.kdsConfigPatch !== null &&
    typeof b.kdsConfigPatch === 'object' &&
    !Array.isArray(b.kdsConfigPatch)
  ) {
    const kp = b.kdsConfigPatch as Record<string, unknown>;
    const kdsConfigPatch: AdminKdsConfigPatch = {};
    const take = <K extends keyof AdminKdsConfigPatch>(key: K) => {
      if (kp[key] !== undefined && kp[key] !== null && typeof kp[key] === 'object' && !Array.isArray(kp[key])) {
        kdsConfigPatch[key] = kp[key] as AdminKdsConfigPatch[K];
      }
    };
    take('layout');
    take('display');
    take('eta');
    take('timerThresholds');
    take('audio');
    if (Object.keys(kdsConfigPatch).length > 0) {
      out.kdsConfigPatch = kdsConfigPatch;
    }
  }

  if (b.hours !== undefined) {
    out.hours = b.hours as CafeHours;
  }

  if (typeof b.themeId === 'string') {
    out.themeId = b.themeId as AdminSettingsPatchBody['themeId'];
  }

  if (Object.prototype.hasOwnProperty.call(b, 'brand')) {
    if (b.brand === null) {
      out.brand = null;
    } else if (b.brand && typeof b.brand === 'object' && !Array.isArray(b.brand)) {
      out.brand = b.brand as AdminSettingsPatchBody['brand'];
    }
  }

  return out;
}
