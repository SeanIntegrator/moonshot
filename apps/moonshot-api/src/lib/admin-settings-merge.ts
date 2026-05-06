import type {
  AdminFeaturesPatch,
  AdminKdsConfigPatch,
  AdminSettingsPatchBody,
  CafeFeatures,
  KdsConfig,
  LoyaltyFeatureConfig,
  OrderAheadFeatureConfig,
} from '@moonshot/types';

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
    if (patch.audio.volume !== undefined) {
      const v = patch.audio.volume;
      if (!Number.isInteger(v) || v < 0 || v > 100) {
        return { ok: false, error: 'audio.volume must be an integer from 0 to 100' };
      }
      next.audio.volume = v;
    }
    if (patch.audio.newOrderSound !== undefined) {
      const s = patch.audio.newOrderSound;
      if (s !== null && typeof s !== 'string') {
        return { ok: false, error: 'audio.newOrderSound must be a string or null' };
      }
      next.audio.newOrderSound = s;
    }
  }

  return { ok: true, value: next };
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

  return out;
}
