/**
 * Deterministic pseudo-random helpers for mock data generation.
 *
 * `Math.random()` is intentionally never used here: given the same seed,
 * every generator in this folder must produce byte-identical output so
 * charts/tables don't visually "jump" on every reload, and so unit tests
 * can assert on exact values.
 */

export type RandomFn = () => number;

/** mulberry32 PRNG — small, fast, good-enough distribution for mock fixtures. */
export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0 || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(random: RandomFn, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function randomFloat(random: RandomFn, min: number, max: number, decimals = 1): number {
  const value = random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function pickOne<T>(random: RandomFn, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** Weighted random pick — `weights` are relative (needn't sum to 1 or 100). */
export function pickWeighted<T>(random: RandomFn, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

export function pickSome<T>(random: RandomFn, items: readonly T[], count: number): T[] {
  return shuffle(random, items).slice(0, Math.min(count, items.length));
}

export function shuffle<T>(random: RandomFn, items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Weighted coin flip: `probability` in [0, 1] is the chance of `true`. */
export function chance(random: RandomFn, probability: number): boolean {
  return random() < probability;
}

/**
 * Derives a stable numeric seed from an arbitrary string (e.g. a real
 * database id). Same id => same seed => same generated values every time,
 * so per-entity mock enrichment doesn't reshuffle on every reload.
 * FNV-1a — simple, fast, good-enough avalanche for this non-cryptographic use.
 */
export function hashStringToSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
