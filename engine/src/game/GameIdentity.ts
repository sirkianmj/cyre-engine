import {
  isAccessibilityTarget,
  isArtDirectionStyle,
  isGamePillarCategory,
  isGameTargetPlatform,
  isNarrativeTone,
  isPlayerRole,
  isProgressionStyle,
  type AccessibilityTarget,
  type ArtDirectionStyle,
  type GameIdentityDefinition,
  type GamePillar,
  type GameTargetPlatform,
  type NarrativeTone,
  type PlayerRole,
  type ProgressionStyle,
} from './GameIdentityTypes.js';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStrings(
  values: string[] | undefined,
  validator: (value: string) => boolean,
  label: string,
): string[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array.`);
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${label} must contain non-empty strings.`);
    }
    const trimmed = value.trim();
    if (!validator(trimmed)) {
      throw new Error(`Invalid ${label.toLowerCase()} "${trimmed}".`);
    }
    if (seen.has(trimmed)) {
      throw new Error(`${label} "${trimmed}" is duplicated.`);
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export class GameIdentity {
  readonly id: string;
  readonly title: string;
  readonly codename: string;
  readonly description: string;
  readonly playerFantasy: string;
  readonly playerRoles: readonly PlayerRole[];
  readonly artDirection: ArtDirectionStyle;
  readonly narrativeTone: NarrativeTone;
  readonly progressionStyle: ProgressionStyle;
  readonly pillars: readonly GamePillar[];
  readonly targetPlatforms: readonly GameTargetPlatform[];
  readonly uiIdentity?: string;
  readonly accessibilityTargets: readonly AccessibilityTarget[];
  readonly tags: readonly string[];
  readonly metadata?: Record<string, unknown>;

  constructor(definition: GameIdentityDefinition) {
    this.validateDefinition(definition);

    this.id = definition.id;
    this.title = definition.title;
    this.codename = definition.codename;
    this.description = definition.description;
    this.playerFantasy = definition.playerFantasy;
    this.playerRoles = Object.freeze([...definition.playerRoles]);
    this.artDirection = definition.artDirection;
    this.narrativeTone = definition.narrativeTone;
    this.progressionStyle = definition.progressionStyle;
    this.pillars = Object.freeze(definition.pillars.map((pillar) => ({
      id: pillar.id,
      name: pillar.name,
      description: pillar.description,
      category: pillar.category,
      weight: pillar.weight,
    })));
    this.targetPlatforms = Object.freeze([...definition.targetPlatforms]);
    this.uiIdentity = definition.uiIdentity;
    this.accessibilityTargets = Object.freeze(
      [...(definition.accessibilityTargets ?? [])],
    );
    this.tags = Object.freeze([...(definition.tags ?? [])]);
    this.metadata = definition.metadata !== undefined
      ? deepClone(definition.metadata)
      : undefined;
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getCodename(): string {
    return this.codename;
  }

  getDefinition(): Readonly<GameIdentityDefinition> {
    return {
      id: this.id,
      title: this.title,
      codename: this.codename,
      description: this.description,
      playerFantasy: this.playerFantasy,
      playerRoles: [...this.playerRoles],
      artDirection: this.artDirection,
      narrativeTone: this.narrativeTone,
      progressionStyle: this.progressionStyle,
      pillars: this.pillars.map((pillar) => deepClone(pillar)),
      targetPlatforms: [...this.targetPlatforms],
      uiIdentity: this.uiIdentity,
      accessibilityTargets: [...this.accessibilityTargets],
      tags: [...this.tags],
      metadata: deepClone(this.metadata),
    };
  }

  getPillars(): GamePillar[] {
    return this.pillars.map((pillar) => deepClone(pillar));
  }

  getPlayerRoles(): PlayerRole[] {
    return [...this.playerRoles];
  }

  getTargetPlatforms(): GameTargetPlatform[] {
    return [...this.targetPlatforms];
  }

  getTags(): string[] {
    return [...this.tags];
  }

  getAccessibilityTargets(): AccessibilityTarget[] {
    return [...this.accessibilityTargets];
  }

  validate(): void {
    this.validateDefinition(this.toJSON() as unknown as GameIdentityDefinition);
  }

  clone(): GameIdentity {
    return GameIdentity.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      codename: this.codename,
      description: this.description,
      playerFantasy: this.playerFantasy,
      playerRoles: [...this.playerRoles],
      artDirection: this.artDirection,
      narrativeTone: this.narrativeTone,
      progressionStyle: this.progressionStyle,
      pillars: this.pillars.map((pillar) => deepClone(pillar)),
      targetPlatforms: [...this.targetPlatforms],
      uiIdentity: this.uiIdentity,
      accessibilityTargets: [...this.accessibilityTargets],
      tags: [...this.tags],
      metadata: deepClone(this.metadata),
    };
  }

  static fromJSON(data: Record<string, unknown>): GameIdentity {
    if (!isRecord(data)) {
      throw new Error('GameIdentity JSON data must be an object.');
    }

    const pillars = Array.isArray(data.pillars)
      ? (data.pillars as unknown[]).map((entry) => {
          const pillar = isRecord(entry) ? entry : {};
          return {
            id: typeof pillar.id === 'string' ? pillar.id : '',
            name: typeof pillar.name === 'string' ? pillar.name : '',
            description: typeof pillar.description === 'string'
              ? pillar.description
              : '',
            category: typeof pillar.category === 'string'
              ? (pillar.category as GamePillar['category'])
              : 'cyber-investigation',
            weight: typeof pillar.weight === 'number' ? pillar.weight : 0,
          };
        })
      : [];

    return new GameIdentity({
      id: typeof data.id === 'string' ? data.id : '',
      title: typeof data.title === 'string' ? data.title : '',
      codename: typeof data.codename === 'string' ? data.codename : '',
      description: typeof data.description === 'string' ? data.description : '',
      playerFantasy: typeof data.playerFantasy === 'string'
        ? data.playerFantasy
        : '',
      playerRoles: Array.isArray(data.playerRoles)
        ? (data.playerRoles as PlayerRole[])
        : [],
      artDirection: typeof data.artDirection === 'string'
        ? (data.artDirection as ArtDirectionStyle)
        : 'minimal-terminal',
      narrativeTone: typeof data.narrativeTone === 'string'
        ? (data.narrativeTone as NarrativeTone)
        : 'realistic',
      progressionStyle: typeof data.progressionStyle === 'string'
        ? (data.progressionStyle as ProgressionStyle)
        : 'linear-campaign',
      pillars,
      targetPlatforms: Array.isArray(data.targetPlatforms)
        ? (data.targetPlatforms as GameTargetPlatform[])
        : [],
      uiIdentity: typeof data.uiIdentity === 'string' ? data.uiIdentity : undefined,
      accessibilityTargets: Array.isArray(data.accessibilityTargets)
        ? (data.accessibilityTargets as AccessibilityTarget[])
        : undefined,
      tags: Array.isArray(data.tags)
        ? (data.tags as string[])
        : undefined,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
    });
  }

  static createDefaultFlagshipIdentity(): GameIdentity {
    return new GameIdentity({
      id: 'cyre-soc-command',
      title: 'SOC Command',
      codename: 'Project Reality Breach',
      description:
        'A cybersecurity investigation and strategy game built on CYRE. Investigate simulated organizations, uncover attack paths, collect evidence, contain incidents, and make real decisions under pressure.',
      playerFantasy:
        'Become the calm, methodical cybersecurity operator who sees what others miss and stops a hidden intrusion before it becomes catastrophic.',
      playerRoles: ['soc-analyst', 'incident-responder', 'threat-hunter'],
      artDirection: 'hybrid',
      narrativeTone: 'thriller',
      progressionStyle: 'linear-campaign',
      pillars: [
        {
          id: 'pillar-investigation',
          name: 'Evidence-Driven Investigation',
          description:
            'Cybersecurity knowledge is the gameplay mechanic. Players interpret real evidence rather than answering multiple-choice questions.',
          category: 'cyber-investigation',
          weight: 1,
        },
        {
          id: 'pillar-simulation',
          name: 'Consequential Simulation',
          description:
            'Every action changes an underlying cyber-world simulation that continues evolving during the mission.',
          category: 'research',
          weight: 1,
        },
        {
          id: 'pillar-defense',
          name: 'Defensive Decision-Making',
          description:
            'Containment, recovery, and trade-offs force players to balance speed and safety.',
          category: 'defense',
          weight: 1,
        },
      ],
      targetPlatforms: ['web', 'mobile', 'desktop', 'console'],
      uiIdentity: 'professional-security-ops',
      accessibilityTargets: [
        'keyboard',
        'screen-reader',
        'high-contrast',
        'color-blind-safe',
        'scalable-text',
        'reduced-motion',
        'controller',
      ],
      tags: [
        'flagship',
        'soc',
        'investigation',
        'strategy',
        'serious-game',
      ],
      metadata: {
        engine: 'CYRE',
        genre: 'cybersecurity-investigation',
        audience: 'security-practitioners-and-learners',
      },
    });
  }

  private validateDefinition(definition: GameIdentityDefinition): void {
    if (!isRecord(definition)) {
      throw new Error('GameIdentity definition must be an object.');
    }
    if (!definition.id || definition.id.trim() === '') {
      throw new Error('GameIdentity id is required.');
    }
    if (!definition.title || definition.title.trim() === '') {
      throw new Error('GameIdentity title is required.');
    }
    if (!definition.codename || definition.codename.trim() === '') {
      throw new Error('GameIdentity codename is required.');
    }
    if (!definition.description || definition.description.trim() === '') {
      throw new Error('GameIdentity description is required.');
    }
    if (!definition.playerFantasy || definition.playerFantasy.trim() === '') {
      throw new Error('GameIdentity playerFantasy is required.');
    }
    if (!isArtDirectionStyle(definition.artDirection)) {
      throw new Error(`Invalid GameIdentity artDirection "${definition.artDirection}".`);
    }
    if (!isNarrativeTone(definition.narrativeTone)) {
      throw new Error(`Invalid GameIdentity narrativeTone "${definition.narrativeTone}".`);
    }
    if (!isProgressionStyle(definition.progressionStyle)) {
      throw new Error(`Invalid GameIdentity progressionStyle "${definition.progressionStyle}".`);
    }
    if (!Array.isArray(definition.playerRoles) || definition.playerRoles.length === 0) {
      throw new Error('GameIdentity must have at least one player role.');
    }
    for (const role of definition.playerRoles) {
      if (!isPlayerRole(role)) {
        throw new Error(`Invalid GameIdentity player role "${role}".`);
      }
    }
    if (!Array.isArray(definition.targetPlatforms) || definition.targetPlatforms.length === 0) {
      throw new Error('GameIdentity must have at least one target platform.');
    }
    for (const platform of definition.targetPlatforms) {
      if (!isGameTargetPlatform(platform)) {
        throw new Error(`Invalid GameIdentity target platform "${platform}".`);
      }
    }
    if (!Array.isArray(definition.pillars) || definition.pillars.length === 0) {
      throw new Error('GameIdentity must have at least one pillar.');
    }
    const pillarIds = new Set<string>();
    for (const pillar of definition.pillars) {
      if (!pillar.id || pillar.id.trim() === '') {
        throw new Error('GamePillar id is required.');
      }
      if (!pillar.name || pillar.name.trim() === '') {
        throw new Error('GamePillar name is required.');
      }
      if (!pillar.description || pillar.description.trim() === '') {
        throw new Error('GamePillar description is required.');
      }
      if (!isGamePillarCategory(pillar.category)) {
        throw new Error(`Invalid GamePillar category "${pillar.category}".`);
      }
      if (!Number.isFinite(pillar.weight) || pillar.weight < 0) {
        throw new Error('GamePillar weight must be a non-negative finite number.');
      }
      if (pillarIds.has(pillar.id)) {
        throw new Error(`Duplicate GamePillar id "${pillar.id}".`);
      }
      pillarIds.add(pillar.id);
    }

    normalizeStrings(definition.accessibilityTargets, isAccessibilityTarget, 'Accessibility target');
    normalizeStrings(definition.tags, () => true, 'Tag');
  }
}
