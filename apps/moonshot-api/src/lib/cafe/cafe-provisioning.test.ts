import { describe, expect, it } from 'vitest';
import { defaultNewCafeFeatures, defaultNewCafeKdsConfig } from './cafe-provisioning.js';

describe('defaultNewCafeFeatures', () => {
  it('enables loyalty and pay-in-store order-ahead for new cafés', () => {
    const features = defaultNewCafeFeatures();
    expect(features.loyalty?.enabled).toBe(true);
    expect(features.loyalty?.stampsPerReward).toBe(10);
    expect(features.order_ahead?.enabled).toBe(true);
    expect(features.order_ahead?.paymentProvider).toBe('pay_in_store');
    expect(features.onboarding_completed_at).toBeNull();
  });
});

describe('defaultNewCafeKdsConfig', () => {
  it('includes ETA and layout defaults', () => {
    const kds = defaultNewCafeKdsConfig();
    expect(kds.eta.basePrepMinutes).toBe(8);
    expect(kds.layout.columns).toBe(3);
    expect(kds.timerThresholds.greenMax).toBe(3);
    expect(kds.audio.enabled).toBe(true);
    expect(kds.audio.newOrderSound).toBe('chime');
    expect(kds.audio.overdueSound).toBe('knock');
  });
});
