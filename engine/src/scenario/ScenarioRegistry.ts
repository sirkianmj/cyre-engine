/**
 * ScenarioRegistry
 * -----------------
 * Manages a collection of scenarios and allows external loading
 * from JSON strings or plain objects.
 */

import { Scenario } from './Scenario.js';
import { ScenarioLoader } from './ScenarioLoader.js';
import type { Scenario as ScenarioData } from './ScenarioTypes.js';

export class ScenarioRegistry {
  private scenarios: Map<string, Scenario> = new Map();

  /**
   * Register a scenario definition.
   * @throws Error if a scenario with the same id already exists.
   */
  register(scenario: Scenario): void {
    if (this.scenarios.has(scenario.getId())) {
      throw new Error(`Scenario with id "${scenario.getId()}" already exists.`);
    }
    this.scenarios.set(scenario.getId(), scenario);
  }

  /**
   * Unregister a scenario by id.
   * @throws Error if the scenario does not exist.
   */
  unregister(id: string): void {
    if (!this.scenarios.has(id)) {
      throw new Error(`Scenario with id "${id}" does not exist.`);
    }
    this.scenarios.delete(id);
  }

  has(id: string): boolean {
    return this.scenarios.has(id);
  }

  get(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  list(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Load a scenario from a JSON string and register it.
   */
  loadFromJSON(json: string): Scenario {
    const scenario = ScenarioLoader.fromJSON(json);
    this.register(scenario);
    return scenario;
  }

  /**
   * Load a scenario from a plain object and register it.
   */
  loadFromObject(obj: unknown): Scenario {
    const scenario = ScenarioLoader.fromObject(obj);
    this.register(scenario);
    return scenario;
  }

  /**
   * Load multiple scenarios from a JSON array string and register them.
   */
  loadAllFromJSONArray(json: string): Scenario[] {
    const scenarios = ScenarioLoader.fromJSONArray(json);
    for (const scenario of scenarios) {
      this.register(scenario);
    }
    return scenarios;
  }

  /**
   * Remove all registered scenarios.
   */
  clear(): void {
    this.scenarios.clear();
  }

  /**
   * Serialise all scenarios to JSON.
   */
  toJSON(): Record<string, ScenarioData> {
    const result: Record<string, ScenarioData> = {};
    for (const [id, scenario] of this.scenarios.entries()) {
      result[id] = scenario.toJSON();
    }
    return result;
  }
}
