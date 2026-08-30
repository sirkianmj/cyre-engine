export interface ReliabilityRunOptions {
  runs?: number;
  maxFailures?: number;
  collectOutputs?: boolean;
  now?: () => number;
}

export interface ReliabilityReport {
  name: string;
  runs: number;
  successes: number;
  failures: number;
  successRate: number;
  firstError?: string;
  lastError?: string;
  totalDurationMs: number;
  averageDurationMs: number;
  passed: boolean;
  deterministicOutputs: boolean;
  outputs: unknown[];
  summary: string;
}

function isRecord(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function safeClone<T>(value: T): T {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? value : JSON.parse(serialized) as T;
  } catch {
    return value;
  }
}

export class ReliabilityChecker {
  readonly name: string;

  constructor(name = 'CYRE Reliability Checker') {
    if (!name || name.trim() === '') {
      throw new Error('ReliabilityChecker name is required.');
    }
    this.name = name;
  }

  run<T>(operation: () => T, options: ReliabilityRunOptions = {}): ReliabilityReport {
    this.validateOptions(options);
    this.validateOperation(operation);

    const runs = options.runs ?? 10;
    const maxFailures = options.maxFailures ?? 0;
    const collectOutputs = options.collectOutputs ?? false;
    const now = options.now ?? (() => Date.now());

    const outputs: unknown[] = [];
    const outputHashes: string[] = [];
    let successes = 0;
    let failures = 0;
    let firstError: string | undefined;
    let lastError: string | undefined;

    const startedAt = now();

    for (let index = 0; index < runs; index += 1) {
      try {
        const result = operation();
        successes += 1;
        outputHashes.push(stableStringify(result));
        if (collectOutputs) {
          outputs.push(safeClone(result));
        }
      } catch (error) {
        failures += 1;
        const message = (error as Error).message ?? 'Unknown reliability check error.';
        if (firstError === undefined) {
          firstError = message;
        }
        lastError = message;
      }
    }

    const endedAt = now();
    const totalDurationMs = Math.max(0, endedAt - startedAt);
    const successRate = runs > 0 ? successes / runs : 0;
    const averageDurationMs = runs > 0 ? totalDurationMs / runs : 0;
    const deterministicOutputs = new Set(outputHashes).size <= 1;
    const passed = failures <= maxFailures;

    return this.createReport({
      runs,
      successes,
      failures,
      successRate,
      firstError,
      lastError,
      totalDurationMs,
      averageDurationMs,
      passed,
      deterministicOutputs,
      outputs,
    });
  }

  async runAsync<T>(
    operation: () => Promise<T> | T,
    options: ReliabilityRunOptions = {},
  ): Promise<ReliabilityReport> {
    this.validateOptions(options);
    this.validateOperation(operation);

    const runs = options.runs ?? 10;
    const maxFailures = options.maxFailures ?? 0;
    const collectOutputs = options.collectOutputs ?? false;
    const now = options.now ?? (() => Date.now());

    const outputs: unknown[] = [];
    const outputHashes: string[] = [];
    let successes = 0;
    let failures = 0;
    let firstError: string | undefined;
    let lastError: string | undefined;

    const startedAt = now();

    for (let index = 0; index < runs; index += 1) {
      try {
        const result = await operation();
        successes += 1;
        outputHashes.push(stableStringify(result));
        if (collectOutputs) {
          outputs.push(safeClone(result));
        }
      } catch (error) {
        failures += 1;
        const message = (error as Error).message ?? 'Unknown reliability check error.';
        if (firstError === undefined) {
          firstError = message;
        }
        lastError = message;
      }
    }

    const endedAt = now();
    const totalDurationMs = Math.max(0, endedAt - startedAt);
    const successRate = runs > 0 ? successes / runs : 0;
    const averageDurationMs = runs > 0 ? totalDurationMs / runs : 0;
    const deterministicOutputs = new Set(outputHashes).size <= 1;
    const passed = failures <= maxFailures;

    return this.createReport({
      runs,
      successes,
      failures,
      successRate,
      firstError,
      lastError,
      totalDurationMs,
      averageDurationMs,
      passed,
      deterministicOutputs,
      outputs,
    });
  }

  expectReliable<T>(
    operation: () => T,
    options: ReliabilityRunOptions = {},
  ): ReliabilityReport {
    const report = this.run(operation, options);
    if (!report.passed) {
      throw new Error(
        `${this.name} failed reliability check: ${report.failures} failure(s) out of ${report.runs} run(s). First error: ${report.firstError ?? 'unknown'}`,
      );
    }
    return report;
  }

  async expectReliableAsync<T>(
    operation: () => Promise<T> | T,
    options: ReliabilityRunOptions = {},
  ): Promise<ReliabilityReport> {
    const report = await this.runAsync(operation, options);
    if (!report.passed) {
      throw new Error(
        `${this.name} failed reliability check: ${report.failures} failure(s) out of ${report.runs} run(s). First error: ${report.firstError ?? 'unknown'}`,
      );
    }
    return report;
  }

  private createReport(partial: {
    runs: number;
    successes: number;
    failures: number;
    successRate: number;
    firstError?: string;
    lastError?: string;
    totalDurationMs: number;
    averageDurationMs: number;
    passed: boolean;
    deterministicOutputs: boolean;
    outputs: unknown[];
  }): ReliabilityReport {
    const summary = [
      this.name,
      `${partial.runs} runs`,
      `${partial.successes} successes`,
      `${partial.failures} failures`,
      `successRate=${partial.successRate.toFixed(2)}`,
      `passed=${partial.passed}`,
      `deterministic=${partial.deterministicOutputs}`,
    ].join(' | ');

    return {
      name: this.name,
      runs: partial.runs,
      successes: partial.successes,
      failures: partial.failures,
      successRate: partial.successRate,
      firstError: partial.firstError,
      lastError: partial.lastError,
      totalDurationMs: partial.totalDurationMs,
      averageDurationMs: partial.averageDurationMs,
      passed: partial.passed,
      deterministicOutputs: partial.deterministicOutputs,
      outputs: partial.outputs,
      summary,
    };
  }

  private validateOperation(operation: unknown): asserts operation is () => unknown {
    if (typeof operation !== 'function') {
      throw new Error('Reliability operation must be a function.');
    }
  }

  private validateOptions(options: ReliabilityRunOptions): void {
    if (!isRecord(options)) {
      throw new Error('Reliability run options must be an object.');
    }

    const runs = options.runs ?? 10;
    if (typeof runs !== 'number' || !Number.isInteger(runs) || runs < 1) {
      throw new Error('Reliability run count must be a positive integer.');
    }

    const maxFailures = options.maxFailures ?? 0;
    if (
      typeof maxFailures !== 'number' ||
      !Number.isInteger(maxFailures) ||
      maxFailures < 0
    ) {
      throw new Error('Reliability maxFailures must be a non-negative integer.');
    }

    if (
      options.collectOutputs !== undefined &&
      typeof options.collectOutputs !== 'boolean'
    ) {
      throw new Error('Reliability collectOutputs must be a boolean if provided.');
    }

    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('Reliability now must be a function if provided.');
    }
  }
}
