/** FNV-1a hash → 32-bit seed. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded RNG from a string key. */
export function rngFrom(key: string): () => number {
  return mulberry32(hashSeed(key));
}

export function pickIndex(length: number, rng: () => number): number {
  return Math.floor(rng() * length);
}

export function pick<T>(arr: T[], rng: () => number): T {
  return arr[pickIndex(arr.length, rng)];
}

/** Fisher–Yates shuffle using a seeded RNG (does not mutate input). */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Picks `n` distinct items from `arr` using a seeded RNG. */
export function sample<T>(arr: T[], n: number, rng: () => number): T[] {
  return shuffle(arr, rng).slice(0, Math.min(n, arr.length));
}
