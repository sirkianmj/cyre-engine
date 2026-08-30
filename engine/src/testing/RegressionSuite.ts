import { ScenarioTestHelper } from './ScenarioTestHelper.js';
import { DeterminismChecker } from './DeterminismChecker.js';
import { ReliabilityChecker } from './ReliabilityChecker.js';
import { ScenarioValidator } from '../scenario/index.js';

export type RegressionCaseStatus = 'passed' | 'failed';

export interface RegressionCaseResult {
  name: string;
  status: RegressionCaseStatus;
  durationMs: number;
  error?: string;
}

export interface RegressionReport {
  name: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  durationMs: number;
  passed: boolean;
  cases: RegressionCaseResult[];
  summary: string;
}

export type RegressionCaseFn = () => void | Promise<void>;

export interface RegressionCase {
  name: string;
  run: RegressionCaseFn;
}

export interface RegressionSuiteOptions {
  now?: () => number;
}

export class RegressionSuite {
  private readonly name: string;
  private readonly cases = new Map<string, RegressionCase>();
  private readonly nowFn: () => number;

  constructor(name = 'CYRE Regression Suite', options: RegressionSuiteOptions = {}) {
    if (!name || name.trim() === '') {
      throw new Error('RegressionSuite name is required.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('RegressionSuite now must be a function if provided.');
    }

    this.name = name.trim();
    this.nowFn = options.now ?? (() => Date.now());
  }

  static createWithBuiltIns(name = 'CYRE Regression Suite'): RegressionSuite {
    const suite = new RegressionSuite(name);
    suite.registerBuiltIns();
    return suite;
  }

  addCase(name: string, run: RegressionCaseFn): void {
    if (!name || name.trim() === '') {
      throw new Error('Regression case name is required.');
    }

    const trimmedName = name.trim();
    if (this.cases.has(trimmedName)) {
      throw new Error(`Regression case "${trimmedName}" is already registered.`);
    }

    if (typeof run !== 'function') {
      throw new Error(`Regression case "${trimmedName}" must provide a function.`);
    }

    this.cases.set(trimmedName, { name: trimmedName, run });
  }

  hasCase(name: string): boolean {
    return this.cases.has(name.trim());
  }

  removeCase(name: string): boolean {
    return this.cases.delete(name.trim());
  }

  clear(): void {
    this.cases.clear();
  }

  listCaseNames(): string[] {
    return [...this.cases.keys()];
  }

  count(): number {
    return this.cases.size;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('RegressionSuite name is required.');
    }

    if (this.cases.size === 0) {
      throw new Error(
        `RegressionSuite "${this.name}" must contain at least one regression case.`,
      );
    }

    const seen = new Set<string>();
    for (const caseName of this.cases.keys()) {
      if (seen.has(caseName)) {
        throw new Error(`Duplicate regression case "${caseName}".`);
      }
      seen.add(caseName);
    }
  }

  async run(): Promise<RegressionReport> {
    this.validate();

    const startedAt = this.nowFn();
    const results: RegressionCaseResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const caseEntry of this.cases.values()) {
      const caseStartedAt = this.nowFn();
      try {
        await caseEntry.run();
        const caseEndedAt = this.nowFn();
        results.push({
          name: caseEntry.name,
          status: 'passed',
          durationMs: Math.max(0, caseEndedAt - caseStartedAt),
        });
        passedCount += 1;
      } catch (error) {
        const caseEndedAt = this.nowFn();
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          name: caseEntry.name,
          status: 'failed',
          durationMs: Math.max(0, caseEndedAt - caseStartedAt),
          error: message,
        });
        failedCount += 1;
      }
    }

    const endedAt = this.nowFn();
    const totalDurationMs = Math.max(0, endedAt - startedAt);
    const passed = failedCount === 0;
    const summary = [
      this.name,
      `${results.length} total`,
      `${passedCount} passed`,
      `${failedCount} failed`,
      `passed=${passed}`,
    ].join(' | ');

    return {
      name: this.name,
      totalCases: results.length,
      passedCases: passedCount,
      failedCases: failedCount,
      durationMs: totalDurationMs,
      passed,
      cases: results,
      summary,
    };
  }

  private registerBuiltIns(): void {
    this.addCase('creates a valid minimal scenario', () => {
      const scenario = ScenarioTestHelper.createMinimalScenario('regression-minimal');
      const data = scenario.toJSON();
      const result = new ScenarioValidator().validate(data);

      if (!result.isValid) {
        throw new Error(`Scenario validation failed: ${result.errors.join(', ')}`);
      }
    });

    this.addCase('minimal scenario creation is deterministic', () => {
      DeterminismChecker.expectDeterministic(
        () => ScenarioTestHelper.createMinimalScenario('regression-determinism').toJSON(),
        5,
      );
    });

    this.addCase('scenario validation is reliable across repeated runs', () => {
      const reliabilityChecker = new ReliabilityChecker('Regression Reliability Check');
      reliabilityChecker.expectReliable(
        () => {
          const scenario = ScenarioTestHelper.createMinimalScenario('regression-reliable');
          const data = scenario.toJSON();
          const result = new ScenarioValidator().validate(data);
          if (!result.isValid) {
            throw new Error(`Validation failed: ${result.errors.join(', ')}`);
          }
          return result.isValid;
        },
        { runs: 5 },
      );
    });
  }
}
