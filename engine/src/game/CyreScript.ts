import type {
  CyreScriptAttacker,
  CyreScriptAttackerSophistication,
  CyreScriptDefense,
  CyreScriptDefenseMonitoringLevel,
  CyreScriptDefinition,
  CyreScriptNetworkNode,
} from './CyreScriptTypes.js';
import { ScenarioDefinition } from '../scenario/index.js';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateUniqueIds(items: Array<{ id: string }>, label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id || item.id.trim() === '') {
      throw new Error(`${label} id must be a non-empty string.`);
    }
    if (seen.has(item.id)) {
      throw new Error(`Duplicate ${label} id "${item.id}".`);
    }
    seen.add(item.id);
  }
}

function validateSophistication(value: string): asserts value is CyreScriptAttackerSophistication {
  if (!['low', 'medium', 'high', 'advanced'].includes(value)) {
    throw new Error(`Invalid attacker sophistication "${value}".`);
  }
}

function validateMonitoringLevel(value: string): asserts value is CyreScriptDefenseMonitoringLevel {
  if (!['none', 'basic', 'advanced'].includes(value)) {
    throw new Error(`Invalid defense monitoring level "${value}".`);
  }
}

function validateStringList(values: string[], label: string): void {
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array.`);
  }
  for (const value of values) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${label} must contain non-empty strings.`);
    }
  }
}

function validateAttacker(attacker: CyreScriptAttacker): void {
  if (!attacker.id || attacker.id.trim() === '') {
    throw new Error('CyreScript attacker id is required.');
  }
  if (!attacker.name || attacker.name.trim() === '') {
    throw new Error('CyreScript attacker name is required.');
  }
  if (!attacker.objective || attacker.objective.trim() === '') {
    throw new Error('CyreScript attacker objective is required.');
  }
  validateSophistication(attacker.sophistication);
}

function validateDefense(defense: CyreScriptDefense): void {
  validateStringList(defense.controls, 'CyreScript defense controls');
  validateMonitoringLevel(defense.monitoringLevel);
}

function validateNetworkNodes(nodes: CyreScriptNetworkNode[]): void {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error('CyreScript must contain at least one network node.');
  }
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!node.id || node.id.trim() === '') {
      throw new Error('CyreScript network node id is required.');
    }
    if (!node.type || node.type.trim() === '') {
      throw new Error('CyreScript network node type is required.');
    }
    if (ids.has(node.id)) {
      throw new Error(`Duplicate CyreScript network node id "${node.id}".`);
    }
    ids.add(node.id);
  }
}

function validateEdgeReferences(
  definition: CyreScriptDefinition,
): void {
  const nodeIds = new Set(definition.networkNodes.map((node) => node.id));
  for (const edge of definition.networkEdges) {
    if (!nodeIds.has(edge.source)) {
      throw new Error(`CyreScript network edge source "${edge.source}" references missing node.`);
    }
    if (!nodeIds.has(edge.target)) {
      throw new Error(`CyreScript network edge target "${edge.target}" references missing node.`);
    }
  }
}

function validateAttackPath(definition: CyreScriptDefinition): void {
  const { source, target, path } = definition.attackPath;
  if (!source || source.trim() === '') {
    throw new Error('CyreScript attack path source is required.');
  }
  if (!target || target.trim() === '') {
    throw new Error('CyreScript attack path target is required.');
  }
  if (!Array.isArray(path) || path.length < 2) {
    throw new Error('CyreScript attack path must contain at least two nodes.');
  }
  const nodeIds = new Set(definition.networkNodes.map((node) => node.id));
  for (const nodeId of path) {
    if (!nodeIds.has(nodeId)) {
      throw new Error(`CyreScript attack path node "${nodeId}" references missing network node.`);
    }
  }
  if (!nodeIds.has(source) || !nodeIds.has(target)) {
    throw new Error('CyreScript attack path source and target must exist in network nodes.');
  }
}

export class CyreScript {
  private readonly definition: Readonly<CyreScriptDefinition>;

  constructor(definition: CyreScriptDefinition) {
    this.validateDefinition(definition);
    this.definition = deepClone(definition);
  }

  getId(): string {
    return this.definition.id;
  }

  getName(): string {
    return this.definition.name;
  }

  getDefinition(): Readonly<CyreScriptDefinition> {
    return deepClone(this.definition);
  }

  toScenarioDefinition(): ScenarioDefinition {
    const d = this.definition;

    return new ScenarioDefinition({
      id: d.id,
      name: d.name,
      description: d.description,
      organization: {
        name: d.organizationName,
        industry: d.industry,
      },
      network: {
        nodes: d.networkNodes.map((node) => ({
          id: node.id,
          type: node.type,
          name: node.name,
        })),
        edges: d.networkEdges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          type: edge.type,
        })),
      },
      assets: d.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        value: asset.value,
        metadata: deepClone(asset.metadata),
      })),
      users: d.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accounts: user.accounts ? [...user.accounts] : undefined,
      })),
      attacker: {
        id: d.attacker.id,
        name: d.attacker.name,
        objective: d.attacker.objective,
        sophistication: d.attacker.sophistication,
      },
      defense: {
        controls: [...d.defense.controls],
        monitoringLevel: d.defense.monitoringLevel,
      },
      attackPath: {
        source: d.attackPath.source,
        target: d.attackPath.target,
        path: [...d.attackPath.path],
      },
      evidence: d.evidence.map((evidence) => ({
        id: evidence.id,
        type: evidence.type,
        title: evidence.title,
        description: evidence.description,
        sourceId: evidence.sourceId,
        timestamp: evidence.timestamp,
        data: deepClone(evidence.data),
      })),
      objectives: d.objectives.map((objective) => ({
        id: objective.id,
        description: objective.description,
        type: objective.type,
      })),
      timeline: d.timeline.map((event) => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        sourceId: event.sourceId,
        targetId: event.targetId,
        data: deepClone(event.data),
      })),
      timeLimitMs: d.timeLimitMs,
      seed: d.seed,
    });
  }

  validate(): void {
    this.validateDefinition(this.definition);
  }

  toJSON(): CyreScriptDefinition {
    return deepClone(this.definition);
  }

  static fromJSON(data: Record<string, unknown>): CyreScript {
    return new CyreScript({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      description: typeof data.description === 'string' ? data.description : undefined,
      organizationName: typeof data.organizationName === 'string' ? data.organizationName : '',
      industry: typeof data.industry === 'string' ? data.industry : undefined,
      networkNodes: Array.isArray(data.networkNodes)
        ? (data.networkNodes as CyreScriptNetworkNode[]).map((node) => ({
            id: typeof node.id === 'string' ? node.id : '',
            type: typeof node.type === 'string' ? node.type : '',
            name: typeof node.name === 'string' ? node.name : undefined,
          }))
        : [],
      networkEdges: Array.isArray(data.networkEdges)
        ? (data.networkEdges as CyreScriptDefinition['networkEdges']).map((edge) => ({
            source: typeof edge.source === 'string' ? edge.source : '',
            target: typeof edge.target === 'string' ? edge.target : '',
            type: typeof edge.type === 'string' ? edge.type : undefined,
          }))
        : [],
      assets: Array.isArray(data.assets)
        ? (data.assets as CyreScriptDefinition['assets']).map((asset) => ({
            id: typeof asset.id === 'string' ? asset.id : '',
            name: typeof asset.name === 'string' ? asset.name : '',
            type: typeof asset.type === 'string' ? asset.type : '',
            value: typeof asset.value === 'number' ? asset.value : 0,
            metadata: isRecord(asset.metadata) ? asset.metadata : undefined,
          }))
        : [],
      users: Array.isArray(data.users)
        ? (data.users as CyreScriptDefinition['users']).map((user) => ({
            id: typeof user.id === 'string' ? user.id : '',
            name: typeof user.name === 'string' ? user.name : '',
            email: typeof user.email === 'string' ? user.email : undefined,
            role: typeof user.role === 'string' ? user.role : undefined,
            accounts: Array.isArray(user.accounts) ? (user.accounts as string[]) : undefined,
          }))
        : [],
      attacker: isRecord(data.attacker)
        ? {
            id: typeof data.attacker.id === 'string' ? data.attacker.id : '',
            name: typeof data.attacker.name === 'string' ? data.attacker.name : '',
            objective: typeof data.attacker.objective === 'string' ? data.attacker.objective : '',
            sophistication: typeof data.attacker.sophistication === 'string'
              ? (data.attacker.sophistication as CyreScriptAttackerSophistication)
              : 'low',
          }
        : { id: '', name: '', objective: '', sophistication: 'low' },
      defense: isRecord(data.defense)
        ? {
            controls: Array.isArray(data.defense.controls)
              ? (data.defense.controls as string[])
              : [],
            monitoringLevel: typeof data.defense.monitoringLevel === 'string'
              ? (data.defense.monitoringLevel as CyreScriptDefenseMonitoringLevel)
              : 'basic',
          }
        : { controls: [], monitoringLevel: 'basic' },
      attackPath: isRecord(data.attackPath)
        ? {
            source: typeof data.attackPath.source === 'string' ? data.attackPath.source : '',
            target: typeof data.attackPath.target === 'string' ? data.attackPath.target : '',
            path: Array.isArray(data.attackPath.path)
              ? (data.attackPath.path as string[]).filter((entry) => typeof entry === 'string')
              : [],
          }
        : { source: '', target: '', path: [] },
      evidence: Array.isArray(data.evidence)
        ? (data.evidence as CyreScriptDefinition['evidence']).map((evidence) => ({
            id: typeof evidence.id === 'string' ? evidence.id : '',
            type: typeof evidence.type === 'string' ? evidence.type : '',
            title: typeof evidence.title === 'string' ? evidence.title : '',
            description: typeof evidence.description === 'string' ? evidence.description : '',
            sourceId: typeof evidence.sourceId === 'string' ? evidence.sourceId : undefined,
            timestamp: typeof evidence.timestamp === 'number' ? evidence.timestamp : undefined,
            data: isRecord(evidence.data) ? evidence.data : undefined,
          }))
        : [],
      objectives: Array.isArray(data.objectives)
        ? (data.objectives as CyreScriptDefinition['objectives']).map((objective) => ({
            id: typeof objective.id === 'string' ? objective.id : '',
            description: typeof objective.description === 'string' ? objective.description : '',
            type: typeof objective.type === 'string' ? objective.type : undefined,
          }))
        : [],
      timeline: Array.isArray(data.timeline)
        ? (data.timeline as CyreScriptDefinition['timeline']).map((event) => ({
            id: typeof event.id === 'string' ? event.id : '',
            type: typeof event.type === 'string' ? event.type : '',
            timestamp: typeof event.timestamp === 'number' ? event.timestamp : 0,
            sourceId: typeof event.sourceId === 'string' ? event.sourceId : undefined,
            targetId: typeof event.targetId === 'string' ? event.targetId : undefined,
            data: isRecord(event.data) ? event.data : undefined,
          }))
        : [],
      timeLimitMs: typeof data.timeLimitMs === 'number' ? data.timeLimitMs : undefined,
      seed: typeof data.seed === 'number' ? data.seed : undefined,
    });
  }

  private validateDefinition(definition: CyreScriptDefinition): void {
    if (!definition.id || definition.id.trim() === '') {
      throw new Error('CyreScript id is required.');
    }
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('CyreScript name is required.');
    }
    if (!definition.organizationName || definition.organizationName.trim() === '') {
      throw new Error('CyreScript organizationName is required.');
    }

    validateNetworkNodes(definition.networkNodes);
    validateEdgeReferences(definition);
    validateAttackPath(definition);
    validateAttacker(definition.attacker);
    validateDefense(definition.defense);

    if (!Array.isArray(definition.objectives) || definition.objectives.length === 0) {
      throw new Error('CyreScript must have at least one objective.');
    }
    validateUniqueIds(definition.objectives, 'CyreScript objective');

    if (definition.assets === undefined || !Array.isArray(definition.assets)) {
      throw new Error('CyreScript assets must be an array.');
    }
    validateUniqueIds(definition.assets, 'CyreScript asset');
    for (const asset of definition.assets) {
      if (!asset.name || asset.name.trim() === '') {
        throw new Error('CyreScript asset name is required.');
      }
      if (!asset.type || asset.type.trim() === '') {
        throw new Error('CyreScript asset type is required.');
      }
      if (!Number.isFinite(asset.value)) {
        throw new Error('CyreScript asset value must be a finite number.');
      }
    }

    validateUniqueIds(definition.users, 'CyreScript user');
    validateUniqueIds(definition.evidence, 'CyreScript evidence');
    validateUniqueIds(definition.timeline, 'CyreScript timeline event');

    if (definition.timeLimitMs !== undefined && definition.timeLimitMs <= 0) {
      throw new Error('CyreScript timeLimitMs must be positive if provided.');
    }
    if (definition.seed !== undefined && !Number.isFinite(definition.seed)) {
      throw new Error('CyreScript seed must be a finite number if provided.');
    }
  }
}
