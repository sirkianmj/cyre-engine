/**
 * MissionFactory
 * ---------------
 * Registry for predefined missions. Allows retrieving mission scenarios
 * by ID.
 */

import { Scenario as ScenarioDefinition } from '../scenario/Scenario.js';
import { createMission001Scenario } from './Mission001.js';

export class MissionFactory {
  private static missions: Map<string, () => ScenarioDefinition> = new Map();

  static register(id: string, factory: () => ScenarioDefinition): void {
    if (this.missions.has(id)) {
      throw new Error(`Mission "${id}" is already registered.`);
    }
    this.missions.set(id, factory);
  }

  static create(id: string): ScenarioDefinition {
    const factory = this.missions.get(id);
    if (!factory) {
      throw new Error(`Mission "${id}" is not registered.`);
    }
    return factory();
  }

  static has(id: string): boolean {
    return this.missions.has(id);
  }

  static list(): string[] {
    return Array.from(this.missions.keys());
  }
}

// Register Mission 001 by default
MissionFactory.register('mission-001', createMission001Scenario);
