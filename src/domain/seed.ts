/**
 * Deterministic "randomness": the same text always gives the same numbers, so
 * an ecosystem grown from the same history always looks the same.
 */

// FNV-1a string hash.
export function hashText(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

// mulberry32: a tiny seeded generator of numbers in [0, 1).
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks one item for `key`, always the same one for the same key. */
export function pickFor<T>(key: string, items: readonly T[]): T {
  const item = items[hashText(key) % items.length];
  if (item === undefined) {
    throw new Error('pickFor() needs a non-empty list');
  }
  return item;
}
