import type {
  CyreScriptAttacker,
  CyreScriptAttackerSophistication,
  CyreScriptDefense,
  CyreScriptDefenseMonitoringLevel,
  CyreScriptDefinition,
  CyreScriptNetworkNode,
  CyreScriptNetworkEdge,
  CyreScriptAsset,
  CyreScriptUser,
  CyreScriptAttackPath,
  CyreScriptEvidence,
  CyreScriptObjective,
  CyreScriptTimelineEvent,
} from './CyreScriptTypes.js';
import { CyreScript } from './CyreScript.js';

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

export class CyreScriptBuilder {
  private idValue?: string;
  private nameValue?: string;
  private descriptionValue?: string;
  private organizationNameValue?: string;
  private industryValue?: string;
  private networkNodesValue: CyreScriptNetworkNode[] = [];
  private networkEdgesValue: CyreScriptNetworkEdge[] = [];
  private assetsValue: CyreScriptAsset[] = [];
  private usersValue: CyreScriptUser[] = [];
  private attackerValue?: CyreScriptAttacker;
  private defenseValue?: CyreScriptDefense;
  private attackPathValue?: CyreScriptAttackPath;
  private evidenceValue: CyreScriptEvidence[] = [];
  private objectivesValue: CyreScriptObjective[] = [];
  private timelineValue: CyreScriptTimelineEvent[] = [];
  private timeLimitMsValue?: number;
  private seedValue?: number;

  withId(id: string): this {
    assertNonEmpty(id, 'CyreScript id');
    this.idValue = id;
    return this;
  }

  withName(name: string): this {
    assertNonEmpty(name, 'CyreScript name');
    this.nameValue = name;
    return this;
  }

  withDescription(description: string): this {
    this.descriptionValue = description;
    return this;
  }

  withOrganization(name: string, industry?: string): this {
    assertNonEmpty(name, 'CyreScript organization name');
    this.organizationNameValue = name;
    this.industryValue = industry;
    return this;
  }

  addNetworkNode(id: string, type: string, name?: string): this {
    assertNonEmpty(id, 'Network node id');
    assertNonEmpty(type, 'Network node type');
    this.networkNodesValue.push({ id, type, name });
    return this;
  }

  addNetworkEdge(source: string, target: string, type?: string): this {
    assertNonEmpty(source, 'Network edge source');
    assertNonEmpty(target, 'Network edge target');
    this.networkEdgesValue.push({ source, target, type });
    return this;
  }

  addAsset(asset: CyreScriptAsset): this {
    assertNonEmpty(asset.id, 'Asset id');
    assertNonEmpty(asset.name, 'Asset name');
    assertNonEmpty(asset.type, 'Asset type');
    if (!Number.isFinite(asset.value)) {
      throw new Error('Asset value must be a finite number.');
    }
    this.assetsValue.push({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      value: asset.value,
      metadata: asset.metadata !== undefined
        ? JSON.parse(JSON.stringify(asset.metadata))
        : undefined,
    });
    return this;
  }

  addUser(user: CyreScriptUser): this {
    assertNonEmpty(user.id, 'User id');
    assertNonEmpty(user.name, 'User name');
    this.usersValue.push({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accounts: user.accounts ? [...user.accounts] : undefined,
    });
    return this;
  }

  setAttacker(attacker: CyreScriptAttacker): this {
    assertNonEmpty(attacker.id, 'Attacker id');
    assertNonEmpty(attacker.name, 'Attacker name');
    assertNonEmpty(attacker.objective, 'Attacker objective');
    if (!['low', 'medium', 'high', 'advanced'].includes(attacker.sophistication)) {
      throw new Error(`Invalid attacker sophistication "${attacker.sophistication}".`);
    }
    this.attackerValue = { ...attacker };
    return this;
  }

  setDefense(
    controls: string[],
    monitoringLevel: CyreScriptDefenseMonitoringLevel,
  ): this {
    if (!Array.isArray(controls)) {
      throw new Error('Defense controls must be an array.');
    }
    for (const control of controls) {
      if (typeof control !== 'string' || control.trim() === '') {
        throw new Error('Defense controls must be non-empty strings.');
      }
    }
    if (!['none', 'basic', 'advanced'].includes(monitoringLevel)) {
      throw new Error(`Invalid defense monitoring level "${monitoringLevel}".`);
    }
    this.defenseValue = {
      controls: [...controls],
      monitoringLevel,
    };
    return this;
  }

  setAttackPath(source: string, target: string, path: string[]): this {
    assertNonEmpty(source, 'Attack path source');
    assertNonEmpty(target, 'Attack path target');
    if (!Array.isArray(path) || path.length < 2) {
      throw new Error('Attack path must contain at least two nodes.');
    }
    for (const node of path) {
      if (typeof node !== 'string' || node.trim() === '') {
        throw new Error('Attack path must contain non-empty strings.');
      }
    }
    this.attackPathValue = { source, target, path: [...path] };
    return this;
  }

  addEvidence(evidence: CyreScriptEvidence): this {
    assertNonEmpty(evidence.id, 'Evidence id');
    assertNonEmpty(evidence.type, 'Evidence type');
    assertNonEmpty(evidence.title, 'Evidence title');
    assertNonEmpty(evidence.description, 'Evidence description');
    this.evidenceValue.push({
      ...evidence,
      data: evidence.data !== undefined
        ? JSON.parse(JSON.stringify(evidence.data))
        : undefined,
    });
    return this;
  }

  addObjective(id: string, description: string, type?: string): this {
    assertNonEmpty(id, 'Objective id');
    assertNonEmpty(description, 'Objective description');
    this.objectivesValue.push({ id, description, type });
    return this;
  }

  addTimelineEvent(event: CyreScriptTimelineEvent): this {
    assertNonEmpty(event.id, 'Timeline event id');
    assertNonEmpty(event.type, 'Timeline event type');
    if (!Number.isFinite(event.timestamp)) {
      throw new Error('Timeline event timestamp must be a finite number.');
    }
    this.timelineValue.push({
      ...event,
      data: event.data !== undefined
        ? JSON.parse(JSON.stringify(event.data))
        : undefined,
    });
    return this;
  }

  setTimeLimit(timeLimitMs: number): this {
    assertFinitePositive(timeLimitMs, 'Time limit');
    this.timeLimitMsValue = timeLimitMs;
    return this;
  }

  setSeed(seed: number): this {
    if (!Number.isFinite(seed)) {
      throw new Error('Seed must be a finite number.');
    }
    this.seedValue = seed;
    return this;
  }

  build(): CyreScriptDefinition {
    const attacker = this.attackerValue;
    if (attacker === undefined) {
      throw new Error('CyreScript attacker is required.');
    }
    const attackPath = this.attackPathValue;
    if (attackPath === undefined) {
      throw new Error('CyreScript attack path is required.');
    }

    const definition: CyreScriptDefinition = {
      id: this.idValue ?? '',
      name: this.nameValue ?? '',
      description: this.descriptionValue,
      organizationName: this.organizationNameValue ?? '',
      industry: this.industryValue,
      networkNodes: this.networkNodesValue.map((node) => ({ ...node })),
      networkEdges: this.networkEdgesValue.map((edge) => ({ ...edge })),
      assets: this.assetsValue.map((asset) => ({
        ...asset,
        metadata: asset.metadata !== undefined
          ? JSON.parse(JSON.stringify(asset.metadata))
          : undefined,
      })),
      users: this.usersValue.map((user) => ({
        ...user,
        accounts: user.accounts ? [...user.accounts] : undefined,
      })),
      attacker: { ...attacker },
      defense: this.defenseValue
        ? { controls: [...this.defenseValue.controls], monitoringLevel: this.defenseValue.monitoringLevel }
        : { controls: [], monitoringLevel: 'basic' },
      attackPath: { ...attackPath, path: [...attackPath.path] },
      evidence: this.evidenceValue.map((evidence) => ({
        ...evidence,
        data: evidence.data !== undefined
          ? JSON.parse(JSON.stringify(evidence.data))
          : undefined,
      })),
      objectives: this.objectivesValue.map((objective) => ({ ...objective })),
      timeline: this.timelineValue.map((event) => ({
        ...event,
        data: event.data !== undefined
          ? JSON.parse(JSON.stringify(event.data))
          : undefined,
      })),
      timeLimitMs: this.timeLimitMsValue,
      seed: this.seedValue,
    };

    new CyreScript(definition).validate();
    return definition;
  }

  buildScript(): CyreScript {
    return new CyreScript(this.build());
  }
}
