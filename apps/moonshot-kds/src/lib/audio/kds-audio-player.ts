import { KDS_SOUNDS, type KdsSoundId, type ToneStep } from '@moonshot/domain';

const COALESCE_MS = 300;

export type KdsAudioPlayerState = 'locked' | 'ready' | 'unsupported';

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const fromWindow = window.AudioContext;
  if (fromWindow) return fromWindow;
  const webkit = (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return webkit ?? null;
}

/**
 * Owns one AudioContext for the KDS board.
 * `unlock()` must run inside a user gesture (login submit or header tap) so
 * iOS Safari will actually play later cues.
 */
export function createKdsAudioPlayer(): {
  unlock: () => void;
  setVolume: (volume: number) => void;
  play: (soundId: KdsSoundId) => void;
  getState: () => KdsAudioPlayerState;
  subscribe: (listener: () => void) => () => void;
} {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let volume = 0.8;
  let lastPlayAt = 0;
  let lastPlayId: KdsSoundId | null = null;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function getState(): KdsAudioPlayerState {
    if (!resolveAudioContextCtor()) return 'unsupported';
    if (!ctx || ctx.state === 'suspended') return 'locked';
    return 'ready';
  }

  function ensureContext(): AudioContext | null {
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      ctx.addEventListener('statechange', notify);
    }
    return ctx;
  }

  function unlock(): void {
    const audio = ensureContext();
    if (!audio || !master) {
      notify();
      return;
    }
    // Silent tick so iOS treats this gesture as unlocking the graph.
    const osc = audio.createOscillator();
    const gate = audio.createGain();
    gate.gain.value = 0;
    osc.connect(gate);
    gate.connect(master);
    osc.start();
    osc.stop(audio.currentTime + 0.02);
    void audio.resume().then(() => notify());
    notify();
  }

  function setVolume(next: number): void {
    volume = Math.min(1, Math.max(0, next / 100));
    if (master) master.gain.value = volume;
  }

  function play(soundId: KdsSoundId): void {
    const spec = KDS_SOUNDS[soundId];
    if (!spec || !ctx || !master || ctx.state !== 'running') return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (lastPlayId === soundId && now - lastPlayAt < COALESCE_MS) return;
    lastPlayId = soundId;
    lastPlayAt = now;
    const t0 = ctx.currentTime;
    for (const step of spec.steps) {
      scheduleStep(ctx, master, t0, step);
    }
  }

  return {
    unlock,
    setVolume,
    play,
    getState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function scheduleStep(
  audio: AudioContext,
  master: GainNode,
  t0: number,
  step: ToneStep,
): void {
  const osc = audio.createOscillator();
  const gate = audio.createGain();
  osc.type = step.type;
  osc.frequency.value = step.freq;
  const start = t0 + step.startMs / 1000;
  const end = start + step.durationMs / 1000;
  gate.gain.setValueAtTime(0.0001, start);
  gate.gain.linearRampToValueAtTime(step.gain, start + 0.008);
  gate.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, start + 0.02));
  osc.connect(gate);
  gate.connect(master);
  osc.start(start);
  osc.stop(end + 0.02);
}
