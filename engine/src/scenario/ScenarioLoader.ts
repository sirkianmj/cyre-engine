/**
 * ScenarioLoader
 * ---------------
 * Loads scenarios from JSON strings or objects.
 */

import { Scenario } from './Scenario.js';
import type { Scenario as ScenarioData } from './ScenarioTypes.js';

export class ScenarioLoader {
  /**
   * Load a scenario from a JSON string.
   */
  static fromJSON(jsonString: string): Scenario {
    let data: unknown;
    try {
      data = JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Invalid JSON string for scenario.');
    }
    if (typeof data !== 'object' || data === null) {
      throw new Error('Scenario JSON must be an object.');
    }
    return new Scenario(data as ScenarioData);
  }

  /**
   * Load a scenario from a plain object.
   */
  static fromObject(obj: unknown): Scenario {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Scenario object must be a non-null object.');
    }
    return new Scenario(obj as ScenarioData);
  }

  /**
   * Load multiple scenarios from a JSON array string.
   */
  static fromJSONArray(jsonString: string): Scenario[] {
    let data: unknown;
    try {
      data = JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Invalid JSON string for scenario array.');
    }
    if (!Array.isArray(data)) {
      throw new Error('Expected a JSON array of scenarios.');
    }
    return data.map((item) => new Scenario(item as ScenarioData));
  }
}
