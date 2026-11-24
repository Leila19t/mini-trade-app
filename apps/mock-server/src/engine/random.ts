/**
 * Seedable randomness, so the mock market is reproducible: the same seed always
 * produces the same history and the same sequence of live ticks.
 */

export type RandomSource = () => number;

/** Small, fast, seedable PRNG (mulberry32). Returns floats in [0, 1). */
export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal samples (mean 0, standard deviation 1) via Box–Muller. */
export function createNormal(random: RandomSource): RandomSource {
  let spare: number | undefined;
  return () => {
    if (spare !== undefined) {
      const value = spare;
      spare = undefined;
      return value;
    }
    let u = 0;
    while (u === 0) u = random(); // log(0) is -Infinity
    const v = random();
    const radius = Math.sqrt(-2 * Math.log(u));
    spare = radius * Math.sin(2 * Math.PI * v);
    return radius * Math.cos(2 * Math.PI * v);
  };
}

/**
 * Stable 32-bit hash of a string (FNV-1a). Used to give every stock its own
 * random stream, so adding a stock never changes the prices of the others.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
