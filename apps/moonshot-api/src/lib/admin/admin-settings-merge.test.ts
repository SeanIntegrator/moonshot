import { describe, expect, it } from 'vitest';
import { DEFAULT_KDS_AUDIO, defaultWeekdayCafeHours } from '@moonshot/domain';
import {
  mergeCafeFeatures,
  mergeKdsConfigSection,
  parseAdminSettingsPatchBody,
  validateCafeHoursPatch,
} from './admin-settings-merge.js';
import { defaultNewCafeKdsConfig } from '../cafe/cafe-provisioning.js';
import type { CafeFeatures, KdsConfig } from '@moonshot/types';

function existing(): KdsConfig {
  return { ...defaultNewCafeKdsConfig(), cafeId: 'cafe-1' };
}

describe('mergeKdsConfigSection audio', () => {
  it('accepts a known sound id and enabled flag', () => {
    const merged = mergeKdsConfigSection(existing(), {
      audio: { enabled: false, newOrderSound: 'ping', overdueSound: 'bell', volume: 40 },
    });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.value.audio.enabled).toBe(false);
    expect(merged.value.audio.newOrderSound).toBe('ping');
    expect(merged.value.audio.overdueSound).toBe('bell');
    expect(merged.value.audio.volume).toBe(40);
    expect(merged.value.audio.overdueRepeatSeconds).toBe(DEFAULT_KDS_AUDIO.overdueRepeatSeconds);
  });

  it('accepts null to disable a cue', () => {
    const merged = mergeKdsConfigSection(existing(), {
      audio: { newOrderSound: null, overdueSound: null },
    });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.value.audio.newOrderSound).toBeNull();
    expect(merged.value.audio.overdueSound).toBeNull();
  });

  it('rejects an unknown sound id', () => {
    const merged = mergeKdsConfigSection(existing(), {
      audio: { newOrderSound: 'laser' as unknown as 'chime' },
    });
    expect(merged.ok).toBe(false);
    if (merged.ok) return;
    expect(merged.error).toMatch(/known sound id/);
  });

  it('rejects overdueRepeatSeconds outside 0–600', () => {
    const high = mergeKdsConfigSection(existing(), { audio: { overdueRepeatSeconds: 601 } });
    expect(high.ok).toBe(false);
    const neg = mergeKdsConfigSection(existing(), { audio: { overdueRepeatSeconds: -1 } });
    expect(neg.ok).toBe(false);
  });

  it('rejects a non-boolean enabled flag', () => {
    const merged = mergeKdsConfigSection(existing(), {
      audio: { enabled: 'yes' as unknown as boolean },
    });
    expect(merged.ok).toBe(false);
  });
});

describe('validateCafeHoursPatch', () => {
  it('accepts split shifts that only touch', () => {
    const hours = defaultWeekdayCafeHours();
    hours.wed = [
      { open: '08:00', close: '11:30' },
      { open: '11:30', close: '16:00' },
    ];
    const result = validateCafeHoursPatch(hours);
    expect(result.ok).toBe(true);
  });

  it('rejects overlapping windows on the same day', () => {
    const hours = defaultWeekdayCafeHours();
    hours.tue = [
      { open: '08:00', close: '12:00' },
      { open: '11:00', close: '16:00' },
    ];
    const result = validateCafeHoursPatch(hours);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/overlap/);
  });
});

describe('parseAdminSettingsPatchBody lastOrderBufferMinutes', () => {
  it('whitelists known buffer values including 0', () => {
    expect(parseAdminSettingsPatchBody({ lastOrderBufferMinutes: 0 }).lastOrderBufferMinutes).toBe(0);
    expect(parseAdminSettingsPatchBody({ lastOrderBufferMinutes: 20 }).lastOrderBufferMinutes).toBe(
      20,
    );
  });

  it('drops unknown buffer values', () => {
    expect(
      parseAdminSettingsPatchBody({ lastOrderBufferMinutes: 12 }).lastOrderBufferMinutes,
    ).toBeUndefined();
  });
});

describe('mergeCafeFeatures loyalty', () => {
  const features: CafeFeatures = {
    loyalty: {
      enabled: true,
      stampsPerReward: 10,
      rewardDescription: 'Free drink',
      doubleStampDays: [],
    },
    events: null,
    promotions: null,
    order_ahead: null,
    review_nudge: null,
    saved_orders: null,
    whatsapp_ordering: null,
  };

  it('rejects a blank reward label when loyalty is enabled', () => {
    const result = mergeCafeFeatures(features, { loyalty: { rewardDescription: '   ' } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/rewardDescription/);
  });
});
