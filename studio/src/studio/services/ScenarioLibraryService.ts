/**
 * ScenarioLibraryService
 * -----------------------
 * Owns the cyber scenario library used by CYRE Studio: the engine catalog
 * plus user authored scenarios. Import/export, structural validation and
 * sandbox execution all delegate to `@cyre/engine`.
 */

import {
  CYBER_SCENARIOS,
  CyberScenarioSandbox,
  SecuritySandboxPolicy,
  deserializeCyberScenarioDefinition,
  serializeCyberScenarioDefinition,
} from '@cyre/engine';

import type {
  CyberScenarioDefinition,
  CyberScenarioNode,
  CyberScenarioNodeType,
} from '@cyre/engine';

export const CYBER_SCENARIO_NODE_TYPES: readonly CyberScenarioNodeType[] = [
  'internet',
  'gateway',
  'web_server',
  'database_server',
  'admin_workstation',
  'internal_network',
];

export interface ScenarioIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ScenarioValidationReport {
  scenarioId: string;
  isValid: boolean;
  issues: ScenarioIssue[];
  sandboxPassed: boolean;
  sandboxError: string | null;
  nodeCount: number;
  hostCount: number;
  validatedAt: number;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  description: string;
  seed: number;
  targetHostId: string;
  nodeCount: number;
  connectionLogCount: number;
  origin: 'catalog' | 'custom';
}

const STORAGE_KEY = 'cyre.studio.customScenarios.v1';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class ScenarioLibraryService {
  private customScenarios = new Map<string, CyberScenarioDefinition>();
  private listeners = new Set<() => void>();
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = ScenarioLibraryService.resolveStorage()) {
    this.storage = storage;
    this.loadPersisted();
  }

  private static resolveStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(): ScenarioSummary[] {
    return [...this.definitions()].map((scenario) => ScenarioLibraryService.summarize(scenario));
  }

  definitions(): CyberScenarioDefinition[] {
    const custom = Array.from(this.customScenarios.values());
    return [...CYBER_SCENARIOS, ...custom];
  }

  get(scenarioId: string): CyberScenarioDefinition | null {
    const catalog = CYBER_SCENARIOS.find((entry) => entry.id === scenarioId);
    if (catalog) return clone(catalog);
    const custom = this.customScenarios.get(scenarioId);
    return custom ? clone(custom) : null;
  }

  isCustom(scenarioId: string): boolean {
    return this.customScenarios.has(scenarioId);
  }

  /** Saves (or replaces) a user authored scenario. */
  save(scenario: CyberScenarioDefinition): CyberScenarioDefinition {
    ScenarioLibraryService.assertEditable(scenario);
    if (CYBER_SCENARIOS.some((entry) => entry.id === scenario.id)) {
      throw new Error(`Scenario id "${scenario.id}" is reserved by the engine catalog.`);
    }

    const stored = clone(scenario);
    this.customScenarios.set(stored.id, stored);
    this.persist();
    this.emit();
    return clone(stored);
  }

  /** Copies a catalog scenario into the editable custom library. */
  duplicate(sourceId: string, newId: string, newName: string): CyberScenarioDefinition {
    const source = this.get(sourceId);
    if (!source) throw new Error(`Scenario "${sourceId}" does not exist.`);

    const copy: CyberScenarioDefinition = {
      ...clone(source),
      id: newId.trim(),
      name: newName.trim() || `${source.name} (copy)`,
    };

    return this.save(copy);
  }

  remove(scenarioId: string): void {
    if (!this.customScenarios.delete(scenarioId)) {
      throw new Error(`Scenario "${scenarioId}" is part of the engine catalog and cannot be deleted.`);
    }
    this.persist();
    this.emit();
  }

  importJSON(json: string): CyberScenarioDefinition {
    const scenario = deserializeCyberScenarioDefinition(json);
    return this.save(scenario);
  }

  exportJSON(scenarioId: string): string {
    const scenario = this.get(scenarioId);
    if (!scenario) throw new Error(`Scenario "${scenarioId}" does not exist.`);
    return serializeCyberScenarioDefinition(scenario);
  }

  /** Structural validation of a scenario definition plus a sandbox trial run. */
  validate(scenario: CyberScenarioDefinition): ScenarioValidationReport {
    const issues: ScenarioIssue[] = [];
    const nodeTypes = new Set<string>(CYBER_SCENARIO_NODE_TYPES);

    if (typeof scenario.id !== 'string' || scenario.id.trim() === '') {
      issues.push({ path: 'id', message: 'Scenario id is required.', severity: 'error' });
    }
    if (typeof scenario.name !== 'string' || scenario.name.trim() === '') {
      issues.push({ path: 'name', message: 'Scenario name is required.', severity: 'error' });
    }
    if (typeof scenario.description !== 'string') {
      issues.push({ path: 'description', message: 'Scenario description must be a string.', severity: 'error' });
    }
    if (!Number.isInteger(scenario.seed) || scenario.seed < 0) {
      issues.push({ path: 'seed', message: 'Seed must be a non-negative integer.', severity: 'error' });
    }

    const nodeIds = new Set<string>();
    const nodes: CyberScenarioNode[] = Array.isArray(scenario.nodes) ? scenario.nodes : [];

    if (nodes.length === 0) {
      issues.push({ path: 'nodes', message: 'A scenario needs at least one node.', severity: 'error' });
    }

    for (const [index, node] of nodes.entries()) {
      const path = `nodes[${index}]`;
      if (!node || typeof node.id !== 'string' || node.id.trim() === '') {
        issues.push({ path: `${path}.id`, message: 'Node id is required.', severity: 'error' });
        continue;
      }
      if (nodeIds.has(node.id)) {
        issues.push({ path: `${path}.id`, message: `Duplicate node id "${node.id}".`, severity: 'error' });
      }
      nodeIds.add(node.id);

      if (typeof node.name !== 'string' || node.name.trim() === '') {
        issues.push({ path: `${path}.name`, message: 'Node name is required.', severity: 'error' });
      }
      if (!nodeTypes.has(node.type)) {
        issues.push({
          path: `${path}.type`,
          message: `Unknown node type "${String(node.type)}".`,
          severity: 'error',
        });
      }

      for (const [serviceIndex, service] of (node.services ?? []).entries()) {
        const servicePath = `${path}.services[${serviceIndex}]`;
        if (!Number.isInteger(service.port) || service.port < 0 || service.port > 65535) {
          issues.push({ path: `${servicePath}.port`, message: 'Port must be between 0 and 65535.', severity: 'error' });
        }
        if (service.protocol !== 'tcp' && service.protocol !== 'udp') {
          issues.push({ path: `${servicePath}.protocol`, message: 'Protocol must be tcp or udp.', severity: 'error' });
        }
      }

      if ((node.services ?? []).length === 0 && node.type !== 'internet' && node.type !== 'internal_network') {
        issues.push({
          path: `${path}.services`,
          message: 'Host exposes no services, so it cannot be enumerated or exploited.',
          severity: 'warning',
        });
      }
    }

    if (!nodeIds.has(scenario.targetHostId)) {
      issues.push({
        path: 'targetHostId',
        message: `Target host "${scenario.targetHostId}" is not part of the scenario.`,
        severity: 'error',
      });
    }

    if (!nodes.some((node) => node.type === 'internet')) {
      issues.push({ path: 'nodes', message: 'Scenario has no internet edge node; the attacker has no entry point.', severity: 'warning' });
    }

    const logs = Array.isArray(scenario.connectionLogs) ? scenario.connectionLogs : [];
    for (const [index, log] of logs.entries()) {
      const path = `connectionLogs[${index}]`;
      if (!log || typeof log.type !== 'string' || log.type.trim() === '') {
        issues.push({ path: `${path}.type`, message: 'Log type is required.', severity: 'error' });
      }
      if (!nodeIds.has(log.source)) {
        issues.push({ path: `${path}.source`, message: `Unknown source "${log.source}".`, severity: 'error' });
      }
      if (log.target !== undefined && !nodeIds.has(log.target)) {
        issues.push({ path: `${path}.target`, message: `Unknown target "${log.target}".`, severity: 'error' });
      }
    }

    // Engine-level policy checks (prototype pollution, required fields).
    for (const violation of SecuritySandboxPolicy.validateScenarioInput(scenario)) {
      issues.push({ path: violation.path, message: violation.message, severity: 'error' });
    }

    const sandbox = CyberScenarioSandbox.execute(serializeCyberScenarioDefinition(scenario));
    const hostCount = sandbox.state
      ? Object.keys((sandbox.state as { hosts: Record<string, unknown> }).hosts ?? {}).length
      : 0;

    return {
      scenarioId: scenario.id,
      isValid: issues.every((issue) => issue.severity !== 'error'),
      issues,
      sandboxPassed: sandbox.success,
      sandboxError: sandbox.error ?? null,
      nodeCount: nodes.length,
      hostCount,
      validatedAt: Date.now(),
    };
  }

  /** Runs the engine sandbox against raw JSON, used by the security window. */
  executeInSandbox(json: string): {
    success: boolean;
    error: string | null;
    escaped: boolean;
    hostCount: number;
  } {
    const result = CyberScenarioSandbox.execute(json);
    const hostCount = result.state
      ? Object.keys((result.state as { hosts: Record<string, unknown> }).hosts ?? {}).length
      : 0;

    return {
      success: result.success,
      error: result.error ?? null,
      escaped: result.escaped,
      hostCount,
    };
  }

  private static summarize(scenario: CyberScenarioDefinition): ScenarioSummary {
    return {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      seed: scenario.seed,
      targetHostId: scenario.targetHostId,
      nodeCount: scenario.nodes.length,
      connectionLogCount: scenario.connectionLogs.length,
      origin: CYBER_SCENARIOS.some((entry) => entry.id === scenario.id) ? 'catalog' : 'custom',
    };
  }

  private static assertEditable(scenario: CyberScenarioDefinition): void {
    if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
      throw new Error('Scenario definition must be an object.');
    }
    if (typeof scenario.id !== 'string' || scenario.id.trim() === '') {
      throw new Error('Scenario id is required.');
    }
    if (typeof scenario.name !== 'string' || scenario.name.trim() === '') {
      throw new Error('Scenario name is required.');
    }
    if (!Array.isArray(scenario.nodes) || scenario.nodes.length === 0) {
      throw new Error('Scenario must contain at least one node.');
    }
    SecuritySandboxPolicy.assertSecureScenario(scenario);
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(this.customScenarios.values())),
      );
    } catch {
      // Storage unavailable: custom scenarios stay in memory for this session.
    }
  }

  private loadPersisted(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CyberScenarioDefinition[];
      if (!Array.isArray(parsed)) return;
      for (const scenario of parsed) {
        if (
          scenario &&
          typeof scenario.id === 'string' &&
          Array.isArray(scenario.nodes) &&
          !CYBER_SCENARIOS.some((entry) => entry.id === scenario.id)
        ) {
          this.customScenarios.set(scenario.id, scenario);
        }
      }
    } catch {
      this.customScenarios.clear();
    }
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}
