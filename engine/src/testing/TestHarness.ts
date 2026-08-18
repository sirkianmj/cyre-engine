/**
 * TestHarness
 * ------------
 * Simplifies creation of a CYRE Engine with deterministic manual clock
 * and loads a scenario into the engine.
 */

import { Engine } from '../core/index.js';
import { ManualClock } from '../core/index.js';
import type { Scenario as ScenarioData } from '../scenario/index.js';
import { ScenarioDefinition as Scenario } from '../scenario/index.js';

export interface HarnessResult {
  engine: Engine;
  clock: ManualClock;
  scenario: Scenario;
}

export class TestHarness {
  /**
   * Create an engine with a manual clock and load a scenario.
   * The engine is initialized and started.
   */
  static async createWithScenario(
    scenarioData: ScenarioData,
    startTime = 0,
  ): Promise<HarnessResult> {
    const scenario = new Scenario(scenarioData);
    const clock = new ManualClock(startTime);
    const engine = new Engine({
      appName: 'CYRE-TestHarness',
      version: 'test',
      logLevel: 'error',
    });

    await engine.initialize();
    await engine.start();

    return { engine, clock, scenario };
  }
}
