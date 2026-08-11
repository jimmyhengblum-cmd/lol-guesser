import { describe, it, expect } from 'vitest';

import { rngFrom, sample, shuffle } from './rng';

describe('seeded rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = rngFrom('2026-06-09');
    const b = rngFrom('2026-06-09');
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = rngFrom('2026-06-09')();
    const b = rngFrom('2026-06-10')();
    expect(a).not.toBe(b);
  });

  it('sample returns the requested count of distinct items, deterministically', () => {
    const pool = Array.from({ length: 20 }, (_, i) => i);
    const s1 = sample(pool, 5, rngFrom('seed'));
    const s2 = sample(pool, 5, rngFrom('seed'));
    expect(s1).toEqual(s2);
    expect(s1).toHaveLength(5);
    expect(new Set(s1).size).toBe(5);
  });

  it('shuffle keeps the same elements', () => {
    const pool = [1, 2, 3, 4, 5];
    const out = shuffle(pool, rngFrom('x'));
    expect([...out].sort((a, b) => a - b)).toEqual(pool);
  });
});
