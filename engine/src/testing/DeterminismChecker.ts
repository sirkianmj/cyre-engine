/**
 * DeterminismChecker
 * --------------------
 * Utility to verify that a function produces the same output for the same inputs.
 * Useful for testing scenario generation, attack path calculation, etc.
 */

export class DeterminismChecker {
  /**
   * Run the given function `runs` times and return true if all outputs are identical
   * by deep equality (JSON stringify).
   *
   * @param fn Function that returns a value.
   * @param runs Number of times to run (default 5).
   */
  static isDeterministic<T>(fn: () => T, runs = 5): boolean {
    if (runs < 2) {
      throw new Error('runs must be at least 2.');
    }
    const first = JSON.stringify(fn());
    for (let i = 1; i < runs; i++) {
      const current = JSON.stringify(fn());
      if (current !== first) {
        return false;
      }
    }
    return true;
  }

  /**
   * Expect determinism; throws if not deterministic.
   */
  static expectDeterministic<T>(fn: () => T, runs = 5): void {
    if (!this.isDeterministic(fn, runs)) {
      throw new Error('Expected function to be deterministic, but outputs differed.');
    }
  }
}
