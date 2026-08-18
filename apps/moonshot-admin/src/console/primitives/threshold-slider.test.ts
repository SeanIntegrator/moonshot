import { describe, expect, it } from 'vitest';
import { clampThresholds } from './threshold-slider.js';

describe('clampThresholds', () => {
  it('keeps a valid pair', () => {
    expect(clampThresholds(6, 10, 20)).toEqual([6, 10]);
  });

  it('pushes late past amber when they would cross', () => {
    expect(clampThresholds(10, 10, 20)).toEqual([10, 11]);
    expect(clampThresholds(12, 8, 20)).toEqual([12, 13]);
  });

  it('clamps to the track', () => {
    expect(clampThresholds(0, 40, 20)).toEqual([1, 20]);
  });
});
