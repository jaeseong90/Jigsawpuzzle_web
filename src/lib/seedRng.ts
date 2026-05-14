// LCG-based seeded RNG. Same seed always returns the same sequence so generated
// images and stage details are stable across reloads, devices, and SSR.
export function seedRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
