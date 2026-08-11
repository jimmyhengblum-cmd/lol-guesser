import { describe, it, expect } from 'vitest';

import { hasUniqueMax, uniqueSample } from './buildDaily';

/**
 * Regression tests for the QCM top-tie bug: `maxIndex` only returns the first
 * option holding the max value, so when two options tied for the winning value
 * the second correct answer was scored wrong. `uniqueSample` must guarantee a
 * strictly unique winner.
 */
describe('hasUniqueMax', () => {
  it('is true when one option strictly tops the metric', () => {
    expect(hasUniqueMax([1, 2, 3], (n) => n)).toBe(true);
  });

  it('is false when the max value is shared (top tie)', () => {
    expect(hasUniqueMax([3, 1, 3], (n) => n)).toBe(false);
  });
});

describe('uniqueSample', () => {
  // A pool riddled with ties on the metric — the exact shape that broke before
  // (e.g. release years / difficulty 1–10 where many champions share a value).
  interface Champ {
    id: number;
    year: number;
  }
  const tiePool: Champ[] = Array.from({ length: 60 }, (_, i) => ({ id: i, year: 2010 + (i % 5) }));
  const metric = (c: Champ) => c.year;

  it('always yields a strictly unique top option, even from a tie-heavy pool', () => {
    for (const seed of ['a', 'b', 'c', '2026-06-11~h14', 'x#hc3']) {
      const opts = uniqueSample(tiePool, 4, seed, metric);
      expect(opts).toHaveLength(4);
      expect(new Set(opts.map((o) => o.id)).size).toBe(4); // distinct
      expect(hasUniqueMax(opts, metric)).toBe(true); // unambiguous winner
    }
  });

  it('is deterministic for the same seed', () => {
    const a = uniqueSample(tiePool, 4, 'seed', metric);
    const b = uniqueSample(tiePool, 4, 'seed', metric);
    expect(a).toEqual(b);
  });

  it('gives different seeds different (still-unique) draws', () => {
    const a = uniqueSample(tiePool, 4, 'seedA', metric);
    const b = uniqueSample(tiePool, 4, 'seedB', metric);
    expect(a).not.toEqual(b);
    expect(hasUniqueMax(a, metric)).toBe(true);
    expect(hasUniqueMax(b, metric)).toBe(true);
  });

  it('falls back to a full-size draw when no unique winner is possible', () => {
    // Every value identical → a unique max can never exist; must still return n.
    const flat: Champ[] = Array.from({ length: 20 }, (_, i) => ({ id: i, year: 7 }));
    const opts = uniqueSample(flat, 4, 'seed', metric);
    expect(opts).toHaveLength(4);
    expect(new Set(opts.map((o) => o.id)).size).toBe(4);
  });
});
