/**
 * MissionFactory
 * ---------------
 * Registry for predefined missions. Allows retrieving mission scenarios
 * by ID.
 */

import { ScenarioDefinition } from '../scenario/index.js';
import { createMission001Scenario } from './Mission001.js';
import { createMission002Scenario } from './Mission002.js';
import { createMission003Scenario } from './Mission003.js';
import { createMission004Scenario } from './Mission004.js';
import { createMission005Scenario } from './Mission005.js';

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

// Register predefined missions
MissionFactory.register('mission-001', createMission001Scenario);
MissionFactory.register('mission-002', createMission002Scenario);
MissionFactory.register('mission-003', createMission003Scenario);
MissionFactory.register('mission-004', createMission004Scenario);
MissionFactory.register('mission-005', createMission005Scenario);
