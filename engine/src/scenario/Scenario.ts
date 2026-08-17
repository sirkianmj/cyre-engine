/**
 * Scenario
 * ---------
 * Represents a full cyber scenario definition.
 * Scenarios are serializable and can be loaded/saved.
 */

import type { Scenario as ScenarioData } from './ScenarioTypes.js';

export class Scenario {
  readonly data: ScenarioData;

  constructor(data: ScenarioData) {
    this.validate(data);
    this.data = deepFreeze({ ...data });
  }

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getData(): Readonly<ScenarioData> {
    return this.data;
  }

  toJSON(): ScenarioData {
    return this.data;
  }

  private validate(data: ScenarioData): void {
    if (!data.id || data.id.trim() === '') {
      throw new Error('Scenario id must be a non-empty string.');
    }
    if (!data.name || data.name.trim() === '') {
      throw new Error('Scenario name must be a non-empty string.');
    }
    if (!data.organization || data.organization.name.trim() === '') {
      throw new Error('Scenario organization name must be a non-empty string.');
    }
    if (!data.network || !Array.isArray(data.network.nodes) || data.network.nodes.length === 0) {
      throw new Error('Scenario network must have at least one node.');
    }
    if (!data.attacker || data.attacker.id.trim() === '') {
      throw new Error('Scenario attacker must have an id.');
    }
    if (!data.attackPath || data.attackPath.path.length < 2) {
      throw new Error('Scenario attack path must contain at least two nodes.');
    }
    if (!Array.isArray(data.objectives) || data.objectives.length === 0) {
      throw new Error('Scenario must have at least one objective.');
    }
    // Check unique IDs for assets/users/evidence/objectives/events
    this.validateUniqueIds(data.assets, 'asset');
    this.validateUniqueIds(data.users, 'user');
    this.validateUniqueIds(data.evidence, 'evidence');
    this.validateUniqueIds(data.objectives, 'objective');
    this.validateUniqueIds(data.timeline, 'timeline event');
  }

  private validateUniqueIds(items: Array<{ id: string }>, label: string): void {
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.id || item.id.trim() === '') {
        throw new Error(`Scenario ${label} id must be a non-empty string.`);
      }
      if (seen.has(item.id)) {
        throw new Error(`Duplicate scenario ${label} id "${item.id}".`);
      }
      seen.add(item.id);
    }
  }
}

function deepFreeze<T>(obj: T): T {
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as any)[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}
