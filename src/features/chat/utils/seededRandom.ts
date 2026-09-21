/**
 * mulberry32 — a small, deterministic PRNG. Same seed always produces the
 * same sequence, which is what makes the Phase 3 perf dataset repeatable
 * across runs and across devices, unlike Math.random().
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;

  return function random(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
