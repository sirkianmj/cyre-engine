/**
 * ScenarioEditor
 * ---------------
 * A simple developer-facing editor for building CYRE scenario definitions.
 * It accumulates components and produces a validated ScenarioDefinition.
 */

import { Scenario as ScenarioDefinition } from './Scenario.js';
import { ScenarioValidator } from './ScenarioValidator.js';
import type {
  Scenario as ScenarioData,
  ScenarioAsset,
  ScenarioUser,
  ScenarioAttacker,
  ScenarioDefense,
  ScenarioNetwork,
  ScenarioAttackPath,
  ScenarioEvidence,
  ScenarioObjective,
  ScenarioEvent,
} from './ScenarioTypes.js';

export class ScenarioEditor {
  private data: ScenarioData;
  private validator: ScenarioValidator;

  constructor(initial: Partial<ScenarioData> = {}) {
    this.data = {
      id: initial.id ?? '',
      name: initial.name ?? '',
      description: initial.description,
      organization: initial.organization ?? { name: '' },
      network: initial.network ?? { nodes: [], edges: [] },
      assets: initial.assets ?? [],
      users: initial.users ?? [],
      attacker: initial.attacker ?? { id: '', name: '', objective: '', sophistication: 'low' },
      defense: initial.defense ?? { controls: [], monitoringLevel: 'none' },
      attackPath: initial.attackPath ?? { source: '', target: '', path: [] },
      evidence: initial.evidence ?? [],
      objectives: initial.objectives ?? [],
      timeline: initial.timeline ?? [],
      timeLimitMs: initial.timeLimitMs,
      seed: initial.seed,
    };
    this.validator = new ScenarioValidator();
  }

  setId(id: string): this {
    this.data.id = id;
    return this;
  }

  setName(name: string): this {
    this.data.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  setOrganization(name: string, industry?: string): this {
    this.data.organization.name = name;
    this.data.organization.industry = industry;
    return this;
  }

  addNetworkNode(id: string, type: string, name?: string): this {
    this.data.network.nodes.push({ id, type, name });
    return this;
  }

  addNetworkEdge(source: string, target: string, type?: string): this {
    this.data.network.edges.push({ source, target, type });
    return this;
  }

  addAsset(id: string, name: string, type: string, value: number): this {
    this.data.assets.push({ id, name, type, value });
    return this;
  }

  addUser(id: string, name: string, options: { email?: string; role?: string; accounts?: string[] } = {}): this {
    this.data.users.push({ id, name, ...options });
    return this;
  }

  setAttacker(id: string, name: string, objective: string, sophistication: ScenarioAttacker['sophistication'] = 'low'): this {
    this.data.attacker = { id, name, objective, sophistication };
    return this;
  }

  setDefense(controls: string[], monitoringLevel: ScenarioDefense['monitoringLevel'] = 'basic'): this {
    this.data.defense = { controls, monitoringLevel };
    return this;
  }

  setAttackPath(source: string, target: string, path: string[]): this {
    this.data.attackPath = { source, target, path };
    return this;
  }

  addEvidence(
    id: string,
    type: string,
    title: string,
    description: string,
    options: { sourceId?: string; timestamp?: number; data?: Record<string, unknown> } = {},
  ): this {
    this.data.evidence.push({ id, type, title, description, ...options });
    return this;
  }

  addObjective(id: string, description: string, type?: string): this {
    this.data.objectives.push({ id, description, type });
    return this;
  }

  addTimelineEvent(
    id: string,
    type: string,
    timestamp: number,
    options: { sourceId?: string; targetId?: string; data?: Record<string, unknown> } = {},
  ): this {
    this.data.timeline.push({ id, type, timestamp, ...options });
    return this;
  }

  setTimeLimit(timeLimitMs: number): this {
    this.data.timeLimitMs = timeLimitMs;
    return this;
  }

  setSeed(seed: number): this {
    this.data.seed = seed;
    return this;
  }

  /**
   * Build a validated ScenarioDefinition from the accumulated data.
   * Throws if validation fails.
   */
  build(): ScenarioDefinition {
    const result = this.validator.validate(this.data);
    if (!result.isValid) {
      throw new Error(
        `Scenario validation failed:\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
      );
    }
    return new ScenarioDefinition(this.data);
  }

  /**
   * Return the current raw data (for inspection).
   */
  getData(): Readonly<ScenarioData> {
    return { ...this.data };
  }
}
