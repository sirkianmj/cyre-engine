import type {
  Scenario as ScenarioData,
  ScenarioAsset,
  ScenarioAttackPath,
  ScenarioAttacker,
  ScenarioDefense,
  ScenarioEvent,
  ScenarioEvidence,
  ScenarioNetwork,
  ScenarioObjective,
  ScenarioUser,
} from './ScenarioTypes.js';
import { ScenarioValidator } from './ScenarioValidator.js';

export type ScenarioGeneratorOrganizationSize = 'small' | 'medium' | 'large';
export type ScenarioGeneratorNetworkComplexity = 'low' | 'medium' | 'high';
export type ScenarioGeneratorAttackerProfile = 'script-kiddie' | 'insider' | 'apt';
export type ScenarioGeneratorVulnerabilityLevel = 'low' | 'medium' | 'high';
export type ScenarioGeneratorDefenseLevel = 'basic' | 'advanced';
export type ScenarioGeneratorObjective =
  | 'data-exfiltration'
  | 'ransomware'
  | 'credential-theft';
export type ScenarioGeneratorDifficulty = 'easy' | 'medium' | 'hard';

export interface ScenarioGeneratorOptions {
  organizationSize: ScenarioGeneratorOrganizationSize;
  networkComplexity: ScenarioGeneratorNetworkComplexity;
  attackerProfile: ScenarioGeneratorAttackerProfile;
  vulnerabilityLevel: ScenarioGeneratorVulnerabilityLevel;
  defenseLevel: ScenarioGeneratorDefenseLevel;
  objective: ScenarioGeneratorObjective;
  difficulty: ScenarioGeneratorDifficulty;
  seed?: number;
}

interface RngState {
  state: number;
}

const ORGANIZATION_NAMES = [
  'Acme Healthcare',
  'Nimbus Financial',
  'Globex Manufacturing',
  'Vertex Legal',
  'Bluebonnet Energy',
  'Cascade Logistics',
];

const INDUSTRIES: Record<ScenarioGeneratorObjective, string> = {
  'data-exfiltration': 'Technology',
  'ransomware': 'Manufacturing',
  'credential-theft': 'Finance',
};

const ATTACKER_NAMES: Record<ScenarioGeneratorAttackerProfile, string> = {
  'script-kiddie': 'Lone Intruder',
  'insider': 'Disgruntled Employee',
  'apt': 'APT-29',
};

const SOPHISTICATION: Record<ScenarioGeneratorAttackerProfile, ScenarioAttacker['sophistication']> = {
  'script-kiddie': 'low',
  'insider': 'medium',
  'apt': 'advanced',
};

const OBJECTIVE_DESCRIPTIONS: Record<ScenarioGeneratorObjective, string> = {
  'data-exfiltration': 'Exfiltrate sensitive organizational data',
  'ransomware': 'Encrypt critical systems and demand ransom',
  'credential-theft': 'Steal privileged credentials for persistent access',
};

const DIFFICULTY_BASE_NODES: Record<ScenarioGeneratorNetworkComplexity, string[]> = {
  low: ['internet', 'firewall', 'workstation-1', 'server-1'],
  medium: ['internet', 'firewall', 'workstation-1', 'workstation-2', 'server-1', 'database-1'],
  high: [
    'internet',
    'firewall',
    'proxy',
    'workstation-1',
    'workstation-2',
    'workstation-3',
    'server-1',
    'server-2',
    'database-1',
    'database-2',
  ],
};

export class ScenarioGenerator {
  private readonly validator = new ScenarioValidator();

  generate(options: ScenarioGeneratorOptions): ScenarioData {
    this.validateOptions(options);
    const rng = new SeededRandom(options.seed ?? 42);

    const network = this.generateNetwork(options.networkComplexity);
    const objectiveTarget = this.resolveObjectiveTarget(network);
    const attackPath = this.generateAttackPath(network, objectiveTarget);

    const users = this.generateUsers(options.organizationSize, rng);
    const assets = this.generateAssets(network, objectiveTarget);
    const evidence = this.generateEvidence(network, options, rng);
    const objectives = this.generateObjectives(options.objective);
    const timeline = this.generateTimeline(evidence, rng);
    const attacker = this.generateAttacker(options.attackerProfile, options.objective);
    const defense = this.generateDefense(options.defenseLevel, options.vulnerabilityLevel);

    const organizationName = ORGANIZATION_NAMES[rng.nextInt(ORGANIZATION_NAMES.length)];
    const id = `generated-scenario-${rng.nextHex(6)}`;
    const objectiveTitle = titleCase(options.objective.replace(/-/g, ' '));

    const data: ScenarioData = {
      id,
      name: `Generated ${objectiveTitle}`,
      description: `Generated CYRE scenario. Objective: ${OBJECTIVE_DESCRIPTIONS[options.objective]}.`,
      organization: {
        name: organizationName,
        industry: INDUSTRIES[options.objective],
      },
      network,
      assets,
      users,
      attacker,
      defense,
      attackPath,
      evidence,
      objectives,
      timeline,
      timeLimitMs: this.resolveTimeLimit(options.difficulty),
      seed: options.seed ?? 42,
    };

    const validation = this.validator.validate(data);
    if (!validation.isValid) {
      throw new Error(
        `Generated scenario validation failed: ${validation.errors.join(', ')}`,
      );
    }

    return data;
  }

  generateMany(
    options: Omit<ScenarioGeneratorOptions, 'seed'>,
    count: number,
    startSeed = 1,
  ): ScenarioData[] {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error('Generated scenario count must be a positive integer.');
    }

    const scenarios: ScenarioData[] = [];
    for (let index = 0; index < count; index += 1) {
      scenarios.push(
        this.generate({
          ...options,
          seed: startSeed + index,
        }),
      );
    }
    return scenarios;
  }

  private generateNetwork(
    complexity: ScenarioGeneratorNetworkComplexity,
  ): ScenarioNetwork {
    const baseNodes = DIFFICULTY_BASE_NODES[complexity];
    const edges: Array<{ source: string; target: string }> = [];

    for (let index = 0; index < baseNodes.length - 1; index += 1) {
      const source = baseNodes[index];
      const target = baseNodes[index + 1];
      edges.push({ source, target });
    }

    if (complexity === 'high') {
      edges.push({ source: 'firewall', target: 'proxy' });
      edges.push({ source: 'proxy', target: 'server-1' });
    }

    return {
      nodes: baseNodes.map((node) => ({
        id: node,
        type: this.resolveNodeType(node),
        name: node,
      })),
      edges,
    };
  }

  private resolveNodeType(nodeId: string): string {
    if (nodeId === 'internet') return 'internet';
    if (nodeId === 'firewall' || nodeId === 'proxy') return 'firewall';
    if (nodeId.startsWith('workstation')) return 'client';
    if (nodeId.startsWith('database')) return 'server';
    return 'server';
  }

  private resolveObjectiveTarget(network: ScenarioNetwork): string {
    const lastNode = network.nodes[network.nodes.length - 1];
    if (!lastNode) {
      throw new Error('Generated network must contain at least one node.');
    }
    return lastNode.id;
  }

  private generateAttackPath(
    network: ScenarioNetwork,
    objectiveTarget: string,
  ): ScenarioAttackPath {
    const source = 'internet';
    const nodeIds = network.nodes.map((node) => node.id);
    const targetIndex = nodeIds.indexOf(objectiveTarget);
    const path = targetIndex >= 0 ? nodeIds.slice(0, targetIndex + 1) : [...nodeIds];

    if (path[0] !== source && nodeIds.includes(source)) {
      path.unshift(source);
    }

    return {
      source,
      target: objectiveTarget,
      path,
    };
  }

  private generateUsers(
    organizationSize: ScenarioGeneratorOrganizationSize,
    _rng: SeededRandom,
  ): ScenarioUser[] {
    const sizeMap: Record<ScenarioGeneratorOrganizationSize, number> = {
      small: 3,
      medium: 6,
      large: 12,
    };

    const count = sizeMap[organizationSize];
    const roles = ['employee', 'analyst', 'administrator', 'contractor'];

    return Array.from({ length: count }, (_, index) => {
      const userId = `user-${index + 1}`;
      return {
        id: userId,
        name: `Employee ${index + 1}`,
        email: `${userId}@example.com`,
        role: roles[index % roles.length],
      };
    });
  }

  private generateAssets(
    network: ScenarioNetwork,
    objectiveTarget: string,
  ): ScenarioAsset[] {
    const serverNodeIds = network.nodes
      .filter((node) => node.type === 'server')
      .map((node) => node.id);

    const assets: ScenarioAsset[] = serverNodeIds.map((nodeId, index) => ({
      id: `asset-${nodeId}`,
      name: nodeId === objectiveTarget ? 'Primary Objective Asset' : `Asset ${index + 1}`,
      type: nodeId.startsWith('database') ? 'database' : 'server',
      value: nodeId === objectiveTarget ? 100 : 40 + index * 10,
    }));

    if (assets.length === 0) {
      assets.push({
        id: 'asset-primary',
        name: 'Primary Objective Asset',
        type: 'server',
        value: 100,
      });
    }

    return assets;
  }

  private generateEvidence(
    network: ScenarioNetwork,
    options: ScenarioGeneratorOptions,
    rng: SeededRandom,
  ): ScenarioEvidence[] {
    const evidence: ScenarioEvidence[] = [];
    const nodeIds = network.nodes.map((node) => node.id);
    const countMap: Record<ScenarioGeneratorVulnerabilityLevel, number> = {
      low: 3,
      medium: 5,
      high: 8,
    };

    const evidenceTypes = [
      'authentication_event',
      'network_record',
      'file',
      'forensic_artifact',
      'system_information',
    ];

    const count = countMap[options.vulnerabilityLevel];
    for (let index = 0; index < count; index += 1) {
      const sourceId = nodeIds[Math.min(nodeIds.length - 1, index + 1)] ?? nodeIds[0];
      const type = evidenceTypes[rng.nextInt(evidenceTypes.length)];
      evidence.push({
        id: `evidence-${index + 1}`,
        type,
        title: `${titleCase(type.replace(/_/g, ' '))} ${index + 1}`,
        description: `Generated evidence ${index + 1} from ${sourceId}.`,
        sourceId,
        timestamp: rng.nextInt(600),
      });
    }

    return evidence;
  }

  private generateObjectives(
    objective: ScenarioGeneratorObjective,
  ): ScenarioObjective[] {
    return [
      {
        id: 'objective-1',
        description: `Identify the attacker objective: ${OBJECTIVE_DESCRIPTIONS[objective]}.`,
        type: 'primary',
      },
      {
        id: 'objective-2',
        description: 'Trace the attack path from internet to the objective target.',
        type: 'secondary',
      },
      {
        id: 'objective-3',
        description: 'Contain the incident and prevent further damage.',
        type: 'secondary',
      },
    ];
  }

  private generateTimeline(
    evidence: ScenarioEvidence[],
    rng: SeededRandom,
  ): ScenarioEvent[] {
    return evidence.map((item, index) => ({
      id: `timeline-${index + 1}`,
      type: item.type,
      timestamp: item.timestamp ?? index * 100,
      sourceId: item.sourceId,
      data: {
        evidenceId: item.id,
        sequence: rng.nextInt(1000),
      },
    }));
  }

  private generateAttacker(
    profile: ScenarioGeneratorAttackerProfile,
    objective: ScenarioGeneratorObjective,
  ): ScenarioAttacker {
    return {
      id: `attacker-${profile}`,
      name: ATTACKER_NAMES[profile],
      objective: OBJECTIVE_DESCRIPTIONS[objective],
      sophistication: SOPHISTICATION[profile],
    };
  }

  private generateDefense(
    defenseLevel: ScenarioGeneratorDefenseLevel,
    vulnerabilityLevel: ScenarioGeneratorVulnerabilityLevel,
  ): ScenarioDefense {
    const controls: string[] = ['firewall', 'siem'];
    if (defenseLevel === 'advanced') {
      controls.push('edr', 'network-segmentation');
    }
    if (vulnerabilityLevel === 'low') {
      controls.push('patching');
    }

    return {
      controls,
      monitoringLevel: defenseLevel,
    };
  }

  private resolveTimeLimit(
    difficulty: ScenarioGeneratorDifficulty,
  ): number {
    const timeMap: Record<ScenarioGeneratorDifficulty, number> = {
      easy: 900000,
      medium: 600000,
      hard: 420000,
    };
    return timeMap[difficulty];
  }

  private validateOptions(options: ScenarioGeneratorOptions): void {
    if (!options || typeof options !== 'object') {
      throw new Error('Scenario generator options are required.');
    }

    if (!['small', 'medium', 'large'].includes(options.organizationSize)) {
      throw new Error(`Invalid organization size "${options.organizationSize}".`);
    }
    if (!['low', 'medium', 'high'].includes(options.networkComplexity)) {
      throw new Error(`Invalid network complexity "${options.networkComplexity}".`);
    }
    if (!['script-kiddie', 'insider', 'apt'].includes(options.attackerProfile)) {
      throw new Error(`Invalid attacker profile "${options.attackerProfile}".`);
    }
    if (!['low', 'medium', 'high'].includes(options.vulnerabilityLevel)) {
      throw new Error(`Invalid vulnerability level "${options.vulnerabilityLevel}".`);
    }
    if (!['basic', 'advanced'].includes(options.defenseLevel)) {
      throw new Error(`Invalid defense level "${options.defenseLevel}".`);
    }
    if (
      !['data-exfiltration', 'ransomware', 'credential-theft'].includes(options.objective)
    ) {
      throw new Error(`Invalid objective "${options.objective}".`);
    }
    if (!['easy', 'medium', 'hard'].includes(options.difficulty)) {
      throw new Error(`Invalid difficulty "${options.difficulty}".`);
    }
    if (options.seed !== undefined && (!Number.isFinite(options.seed) || options.seed < 0)) {
      throw new Error('Scenario generator seed must be a non-negative finite number.');
    }
  }
}

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = Math.floor(seed) || 1;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  nextHex(length: number): string {
    let result = '';
    for (let index = 0; index < length; index += 1) {
      result += this.nextInt(16).toString(16);
    }
    return result;
  }
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
