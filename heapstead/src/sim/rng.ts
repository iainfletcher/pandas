/**
 * Seeded PRNG (SPEC §12.1). `Math.random` is lint-banned inside src/sim; this
 * is the only source of randomness the simulation has.
 *
 * mulberry32: small, fast, good enough for jitter and tie-breaking, and — the
 * only property that actually matters here — reproducible from a seed.
 */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** A fresh independent stream, so one mover's draws cannot shift another's. */
  fork(salt: number): Rng;
}

export const makeRng = (seed: number): Rng => {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    fork: (salt) => makeRng((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0),
  };
};
