import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetMenuImageCacheForTests,
  getMenuImageStatus,
  prefetchMenuImages,
  watchMenuImage,
} from './menu-image-cache.js';

const URL = 'https://cdn.example/latte.webp';

function stubImage(onSetSrc: (img: HTMLImageElement) => void) {
  vi.stubGlobal(
    'Image',
    class MockImage {
      decoding = 'async';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        onSetSrc(this as unknown as HTMLImageElement);
      }
    },
  );
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('menu-image-cache', () => {
  afterEach(() => {
    __resetMenuImageCacheForTests();
    vi.unstubAllGlobals();
  });

  it('notifies watchMenuImage when prefetch finished before subscribe', async () => {
    stubImage((img) => queueMicrotask(() => img.onload?.(new Event('load'))));
    prefetchMenuImages([URL]);
    await flushMicrotasks();
    expect(getMenuImageStatus(URL)).toBe('loaded');

    let notified = false;
    watchMenuImage(URL, () => {
      notified = true;
    });

    expect(notified).toBe(true);
  });

  it('retries a failed prefetch when a component subscribes', async () => {
    let attempts = 0;
    stubImage((img) => {
      attempts += 1;
      queueMicrotask(() =>
        attempts === 1 ? img.onerror?.(new Event('error')) : img.onload?.(new Event('load')),
      );
    });

    prefetchMenuImages([URL]);
    await flushMicrotasks();
    expect(getMenuImageStatus(URL)).toBe('error');

    let notified = false;
    watchMenuImage(URL, () => {
      notified = true;
    });
    await flushMicrotasks();

    expect(attempts).toBe(2);
    expect(notified).toBe(true);
    expect(getMenuImageStatus(URL)).toBe('loaded');
  });
});
