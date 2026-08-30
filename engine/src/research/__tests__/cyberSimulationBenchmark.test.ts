import { describe, expect, it } from 'vitest';
import { runCyberSimulationBenchmark } from '../CyberSimulationPerformanceBenchmark.js';

describe('cyber simulation performance benchmark', () => {
  it('runs many cyber simulations without failure', () => {
    const result = runCyberSimulationBenchmark(50);

    expect(result.completed).toBe(true);
    expect(result.iterations).toBe(50);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.operationsPerSecond).toBeGreaterThan(0);
  });

  it('rejects invalid iteration counts', () => {
    expect(() => runCyberSimulationBenchmark(0)).toThrowError(
      /positive integer/i,
    );
    expect(() => runCyberSimulationBenchmark(-1)).toThrowError(
      /positive integer/i,
    );
    expect(() => runCyberSimulationBenchmark(1.5)).toThrowError(
      /positive integer/i,
    );
  });
});
