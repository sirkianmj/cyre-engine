import { PROJECT_TEMPLATES } from './ProjectTemplates.js';

export type SampleProjectCategory = 'game' | 'training' | 'research';

export interface SampleProjectDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: SampleProjectCategory;
  readonly templateId: string;
  readonly sceneIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly missionIds: readonly string[];
  readonly assetIds: readonly string[];
  readonly tags: readonly string[];
}

const defaultSampleProjects: readonly SampleProjectDefinition[] = [
  {
    id: 'soc-investigation-game',
    name: 'SOC Investigation Game',
    description:
      'A complete investigation-focused cybersecurity game sample with a campaign and evidence-driven gameplay.',
    category: 'game',
    templateId: 'soc-game',
    sceneIds: ['organization', 'network', 'office'],
    scenarioIds: ['compromised-employee', 'ransomware'],
    missionIds: ['mission-001', 'mission-002'],
    assetIds: ['dashboard', 'terminal', 'network-map'],
    tags: ['soc', 'investigation', 'game'],
  },
  {
    id: 'cyber-investigation-game',
    name: 'Cyber Investigation Game',
    description:
      'A story-driven cyber investigation game sample built around evidence and attack paths.',
    category: 'game',
    templateId: 'investigation-game',
    sceneIds: ['organization', 'network', 'incident'],
    scenarioIds: ['insider-threat'],
    missionIds: ['mission-003'],
    assetIds: ['evidence-board', 'timeline', 'network-map'],
    tags: ['investigation', 'story'],
  },
  {
    id: 'red-team-operations-game',
    name: 'Red Team Operations Game',
    description:
      'A red-team operations game sample where the player plans controlled offensive cyber operations.',
    category: 'game',
    templateId: 'red-team-game',
    sceneIds: ['attack-lab', 'target-network'],
    scenarioIds: ['basic-intrusion'],
    missionIds: [],
    assetIds: ['attack-graph', 'network-map'],
    tags: ['red-team', 'offensive'],
  },
  {
    id: 'cyber-security-training-sim',
    name: 'Cyber Security Training Simulator',
    description:
      'A training simulation focused on incident response and defensive workflows.',
    category: 'training',
    templateId: 'training-simulation',
    sceneIds: ['training-lab', 'incident-room'],
    scenarioIds: ['phishing-response', 'insider-threat'],
    missionIds: ['mission-003'],
    assetIds: ['evidence-board', 'timeline', 'alert-list'],
    tags: ['training', 'incident-response'],
  },
  {
    id: 'cyre-research-experiment',
    name: 'CYRE Research Experiment',
    description:
      'A reproducible experiment project for collecting telemetry and scenario datasets.',
    category: 'research',
    templateId: 'research-experiment',
    sceneIds: ['experiment-environment'],
    scenarioIds: ['adaptive-difficulty-baseline'],
    missionIds: [],
    assetIds: ['telemetry', 'research-dataset'],
    tags: ['research', 'telemetry', 'reproducibility'],
  },
];

export class SampleProjects {
  private constructor() {}

  static list(): SampleProjectDefinition[] {
    return defaultSampleProjects.map(cloneSampleProject);
  }

  static get(id: string): SampleProjectDefinition {
    const project = defaultSampleProjects.find((item) => item.id === id);
    if (!project) {
      throw new Error(`Sample project not found: ${id}`);
    }

    return cloneSampleProject(project);
  }

  static validate(): void {
    const templateIds = new Set(PROJECT_TEMPLATES.map((template) => template.id));
    const ids = new Set<string>();

    for (const project of defaultSampleProjects) {
      if (ids.has(project.id)) {
        throw new Error(`Duplicate sample project id: ${project.id}`);
      }

      ids.add(project.id);

      if (
        project.name.trim().length === 0 ||
        project.description.trim().length === 0 ||
        project.templateId.trim().length === 0
      ) {
        throw new Error(`Sample project ${project.id} is missing required fields.`);
      }

      if (!templateIds.has(project.templateId)) {
        throw new Error(
          `Sample project ${project.id} references missing template: ${project.templateId}`,
        );
      }
    }
  }

  static categories(): SampleProjectCategory[] {
    return [...new Set(defaultSampleProjects.map((project) => project.category))];
  }
}

function cloneSampleProject(
  project: SampleProjectDefinition,
): SampleProjectDefinition {
  return {
    ...project,
    sceneIds: [...project.sceneIds],
    scenarioIds: [...project.scenarioIds],
    missionIds: [...project.missionIds],
    assetIds: [...project.assetIds],
    tags: [...project.tags],
  };
}
