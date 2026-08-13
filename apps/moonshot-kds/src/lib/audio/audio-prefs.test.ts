import { afterEach, describe, expect, it } from 'vitest';
import { loadKdsSoundMuted, saveKdsSoundMuted } from './audio-prefs.js';

const store = new Map<string, string>();

const memoryStorage: Storage = {
  get length() {
    return store.size;
  },
  clear() {
    store.clear();
  },
  getItem(key: string) {
    return store.get(key) ?? null;
  },
  key(index: number) {
    return [...store.keys()][index] ?? null;
  },
  removeItem(key: string) {
    store.delete(key);
  },
  setItem(key: string, value: string) {
    store.set(key, value);
  },
};

afterEach(() => {
  store.clear();
});

describe('audio-prefs', () => {
  it('round-trips device mute through localStorage', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: memoryStorage,
    });
    expect(loadKdsSoundMuted()).toBe(false);
    saveKdsSoundMuted(true);
    expect(loadKdsSoundMuted()).toBe(true);
    saveKdsSoundMuted(false);
    expect(loadKdsSoundMuted()).toBe(false);
  });

  it('returns false when localStorage throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    expect(loadKdsSoundMuted()).toBe(false);
    expect(() => saveKdsSoundMuted(true)).not.toThrow();
  });
});
