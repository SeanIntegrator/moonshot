import type { KdsAudioConfig, KdsSoundId } from '@moonshot/types';

export type { KdsSoundId };

/** Oscillator waveform — local union so this package does not need the DOM lib. */
export type ToneWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth';

export type ToneStep = {
  freq: number;
  startMs: number;
  durationMs: number;
  type: ToneWaveform;
  gain: number;
};

export type KdsSoundSpec = {
  label: string;
  steps: ToneStep[];
};

/**
 * Declarative tone catalogue — adding a sound means adding a map entry, nothing else.
 * Distinct enough that a barista can tell new-order from overdue without looking.
 */
export const KDS_SOUNDS: Record<KdsSoundId, KdsSoundSpec> = {
  chime: {
    label: 'Chime',
    steps: [
      { freq: 880, startMs: 0, durationMs: 140, type: 'sine', gain: 0.55 },
      { freq: 1174, startMs: 130, durationMs: 220, type: 'sine', gain: 0.7 },
    ],
  },
  ping: {
    label: 'Ping',
    steps: [
      { freq: 1320, startMs: 0, durationMs: 90, type: 'triangle', gain: 0.5 },
      { freq: 1760, startMs: 70, durationMs: 70, type: 'triangle', gain: 0.35 },
    ],
  },
  marimba: {
    label: 'Marimba',
    steps: [
      { freq: 523, startMs: 0, durationMs: 160, type: 'triangle', gain: 0.65 },
      { freq: 659, startMs: 90, durationMs: 160, type: 'triangle', gain: 0.55 },
      { freq: 784, startMs: 180, durationMs: 220, type: 'triangle', gain: 0.45 },
    ],
  },
  bell: {
    label: 'Bell',
    steps: [
      { freq: 988, startMs: 0, durationMs: 420, type: 'sine', gain: 0.5 },
      { freq: 1480, startMs: 0, durationMs: 260, type: 'sine', gain: 0.22 },
    ],
  },
  knock: {
    label: 'Knock',
    steps: [
      { freq: 180, startMs: 0, durationMs: 90, type: 'square', gain: 0.55 },
      { freq: 180, startMs: 150, durationMs: 90, type: 'square', gain: 0.55 },
      { freq: 120, startMs: 300, durationMs: 120, type: 'square', gain: 0.4 },
    ],
  },
};

export const KDS_SOUND_IDS = Object.keys(KDS_SOUNDS) as KdsSoundId[];

export const DEFAULT_KDS_AUDIO: KdsAudioConfig = {
  enabled: true,
  newOrderSound: 'chime',
  overdueSound: 'knock',
  overdueRepeatSeconds: 60,
  volume: 80,
};

export function isKdsSoundId(value: unknown): value is KdsSoundId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(KDS_SOUNDS, value);
}

function normalizeSound(value: unknown, fallback: KdsSoundId | null): KdsSoundId | null {
  if (value === null) return null;
  if (isKdsSoundId(value)) return value;
  return fallback;
}

/** Fill gaps so older `kds_config.audio` rows stay usable. Explicit `null` sounds stay off. */
export function normalizeKdsAudio(raw: unknown): KdsAudioConfig {
  const rec =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const repeat = rec.overdueRepeatSeconds;
  const volume = rec.volume;
  return {
    enabled: typeof rec.enabled === 'boolean' ? rec.enabled : DEFAULT_KDS_AUDIO.enabled,
    newOrderSound: normalizeSound(rec.newOrderSound, DEFAULT_KDS_AUDIO.newOrderSound),
    overdueSound: normalizeSound(rec.overdueSound, DEFAULT_KDS_AUDIO.overdueSound),
    overdueRepeatSeconds:
      typeof repeat === 'number' && Number.isInteger(repeat) && repeat >= 0 && repeat <= 600
        ? repeat
        : DEFAULT_KDS_AUDIO.overdueRepeatSeconds,
    volume:
      typeof volume === 'number' && Number.isInteger(volume) && volume >= 0 && volume <= 100
        ? volume
        : DEFAULT_KDS_AUDIO.volume,
  };
}
