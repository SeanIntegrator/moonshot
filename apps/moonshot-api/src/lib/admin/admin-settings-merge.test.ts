import { describe, expect, it } from 'vitest';
import { DEFAULT_KDS_AUDIO } from '@moonshot/domain';
import { mergeKdsConfigSection } from './admin-settings-merge.js';
import { defaultNewCafeKdsConfig } from '../cafe/cafe-provisioning.js';
import type { KdsConfig } from '@moonshot/types';

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
