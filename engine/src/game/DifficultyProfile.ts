import {
  Difficulty,
  DIFFICULTY_SETTINGS,
  type DifficultySettings,
} from './Difficulty.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

export interface DifficultyProfileOptions {
  id: string;
  name: string;
  difficulty: Difficulty;
  scoreMultiplier: number;
  timeMultiplier: number;
  ambiguityMultiplier?: number;
  description?: string;
}

export class DifficultyProfile {
  readonly id: string;
  readonly name: string;
  readonly difficulty: Difficulty;
  readonly scoreMultiplier: number;
  readonly timeMultiplier: number;
  readonly ambiguityMultiplier: number;
  readonly description?: string;

  constructor(options: DifficultyProfileOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Difficulty profile id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Difficulty profile name is required.');
    }
    if (
      !Object.values(Difficulty).includes(options.difficulty)
    ) {
      throw new Error(`Invalid difficulty "${options.difficulty}".`);
    }

    assertPositiveFinite(options.scoreMultiplier, 'Score multiplier');
    assertPositiveFinite(options.timeMultiplier, 'Time multiplier');

    if (
      options.ambiguityMultiplier !== undefined &&
      (!Number.isFinite(options.ambiguityMultiplier) || options.ambiguityMultiplier <= 0)
    ) {
      throw new Error('Ambiguity multiplier must be a positive finite number.');
    }
    if (options.description !== undefined && typeof options.description !== 'string') {
      throw new Error('Difficulty profile description must be a string if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.difficulty = options.difficulty;
    this.scoreMultiplier = options.scoreMultiplier;
    this.timeMultiplier = options.timeMultiplier;
    this.ambiguityMultiplier = options.ambiguityMultiplier ?? 1;
    this.description = options.description;
  }

  getSettings(): DifficultySettings {
    return {
      label: DIFFICULTY_SETTINGS[this.difficulty].label,
      scoreMultiplier: this.scoreMultiplier,
      timeMultiplier: this.timeMultiplier,
    };
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Difficulty profile id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('Difficulty profile name is required.');
    }
    if (!Object.values(Difficulty).includes(this.difficulty)) {
      throw new Error(`Invalid difficulty "${this.difficulty}".`);
    }
    assertPositiveFinite(this.scoreMultiplier, 'Score multiplier');
    assertPositiveFinite(this.timeMultiplier, 'Time multiplier');
    assertPositiveFinite(this.ambiguityMultiplier, 'Ambiguity multiplier');
  }

  clone(): DifficultyProfile {
    return DifficultyProfile.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      difficulty: this.difficulty,
      scoreMultiplier: this.scoreMultiplier,
      timeMultiplier: this.timeMultiplier,
      ambiguityMultiplier: this.ambiguityMultiplier,
      description: this.description,
    };
  }

  static fromJSON(data: Record<string, unknown>): DifficultyProfile {
    if (!isRecord(data)) {
      throw new Error('Difficulty profile JSON data must be an object.');
    }

    return new DifficultyProfile({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      difficulty: typeof data.difficulty === 'string'
        ? (data.difficulty as Difficulty)
        : Difficulty.Normal,
      scoreMultiplier: typeof data.scoreMultiplier === 'number'
        ? data.scoreMultiplier
        : 1,
      timeMultiplier: typeof data.timeMultiplier === 'number'
        ? data.timeMultiplier
        : 1,
      ambiguityMultiplier: typeof data.ambiguityMultiplier === 'number'
        ? data.ambiguityMultiplier
        : 1,
      description: typeof data.description === 'string'
        ? data.description
        : undefined,
    });
  }

  static fromBaseDifficulty(difficulty: Difficulty): DifficultyProfile {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    return new DifficultyProfile({
      id: `difficulty-${difficulty}`,
      name: settings.label,
      difficulty,
      scoreMultiplier: settings.scoreMultiplier,
      timeMultiplier: settings.timeMultiplier,
      ambiguityMultiplier: difficulty === Difficulty.Easy ? 0.75 : difficulty === Difficulty.Expert ? 1.5 : 1,
      description: `Built-in ${settings.label} difficulty profile.`,
    });
  }

  static createDefaultProfiles(): DifficultyProfile[] {
    return Object.values(Difficulty).map((difficulty) =>
      DifficultyProfile.fromBaseDifficulty(difficulty),
    );
  }
}
