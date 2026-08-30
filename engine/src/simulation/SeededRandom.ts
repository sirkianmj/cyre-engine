/**
 * SeededRandom
 * --------------
 * Deterministic PRNG used by the canonical simulation runtime.
 * Implements mulberry32. All simulation randomness must use this source.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    if (!Number.isFinite(seed)) {
      throw new Error('SeededRandom seed must be a finite number.');
    }
    this.state = seed >>> 0;
  }

  getState(): number {
    return this.state;
  }

  static fromState(state: number): SeededRandom {
    const random = new SeededRandom(0);
    random.state = state >>> 0;
    return random;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error('SeededRandom nextInt maxExclusive must be a positive integer.');
    }
    return Math.floor(this.next() * maxExclusive);
  }

  /** Returns a float in [min, max). */
  nextFloat(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      throw new Error('SeededRandom nextFloat requires finite min < max.');
    }
    return min + this.next() * (max - min);
  }

  /** Returns true with probability p. */
  nextBoolean(probability = 0.5): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error('SeededRandom nextBoolean probability must be between 0 and 1.');
    }
    return this.next() < probability;
  }
}
