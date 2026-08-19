import {
  Difficulty,
  DIFFICULTY_SETTINGS,
  type DifficultySettings,
} from './Difficulty.js';
import { DifficultyProfile } from './DifficultyProfile.js';
import { ScenarioDefinition } from '../scenario/index.js';
import type { Scenario } from '../scenario/index.js';

export interface DifficultyManagerSnapshot {
  name: string;
  profileCount: number;
  currentDifficulty: Difficulty;
  profileIds: string[];
  profiles: DifficultyProfile[];
  summary: string;
}

export interface DifficultyManagerOptions {
  name?: string;
  currentDifficulty?: Difficulty;
  profiles?: DifficultyProfile[];
}

export class DifficultyManager {
  readonly name: string;
  private currentDifficulty: Difficulty;
  private readonly profiles = new Map<string, DifficultyProfile>();

  constructor(options: DifficultyManagerOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('DifficultyManager name cannot be empty if provided.');
    }
    if (
      options.currentDifficulty !== undefined &&
      !Object.values(Difficulty).includes(options.currentDifficulty)
    ) {
      throw new Error(`Invalid current difficulty "${options.currentDifficulty}".`);
    }

    this.name = options.name ?? 'CYRE Difficulty Manager';
    this.currentDifficulty = options.currentDifficulty ?? Difficulty.Normal;

    const profiles = options.profiles ?? DifficultyProfile.createDefaultProfiles();
    if (!Array.isArray(profiles)) {
      throw new Error('Difficulty manager profiles must be an array.');
    }
    for (const profile of profiles) {
      this.registerProfile(profile);
    }
  }

  registerProfile(profile: DifficultyProfile): void {
    profile.validate();
    if (this.profiles.has(profile.id)) {
      throw new Error(`Difficulty profile "${profile.id}" is already registered.`);
    }
    this.profiles.set(profile.id, profile.clone());
  }

  unregisterProfile(id: string): void {
    if (!this.profiles.delete(id)) {
      throw new Error(`Difficulty profile "${id}" does not exist.`);
    }
  }

  hasProfile(id: string): boolean {
    return this.profiles.has(id);
  }

  getProfile(id: string): DifficultyProfile | undefined {
    const profile = this.profiles.get(id);
    return profile !== undefined ? profile.clone() : undefined;
  }

  listProfiles(): DifficultyProfile[] {
    return Array.from(this.profiles.values()).map((profile) => profile.clone());
  }

  listProfileIds(): string[] {
    return Array.from(this.profiles.keys()).sort();
  }

  setCurrentDifficulty(difficulty: Difficulty): void {
    if (!Object.values(Difficulty).includes(difficulty)) {
      throw new Error(`Invalid difficulty "${difficulty}".`);
    }
    this.currentDifficulty = difficulty;
  }

  getCurrentDifficulty(): Difficulty {
    return this.currentDifficulty;
  }

  getCurrentSettings(): DifficultySettings {
    return { ...DIFFICULTY_SETTINGS[this.currentDifficulty] };
  }

  getProfileForDifficulty(difficulty: Difficulty): DifficultyProfile | undefined {
    if (!Object.values(Difficulty).includes(difficulty)) {
      throw new Error(`Invalid difficulty "${difficulty}".`);
    }
    const builtInId = `difficulty-${difficulty}`;
    return this.getProfile(builtInId);
  }

  applyDifficultyToScenario(
    scenario: ScenarioDefinition,
    difficulty: Difficulty = this.currentDifficulty,
  ): ScenarioDefinition {
    if (!Object.values(Difficulty).includes(difficulty)) {
      throw new Error(`Invalid difficulty "${difficulty}".`);
    }

    const settings = DIFFICULTY_SETTINGS[difficulty];
    const data = scenario.getData();
    const baseTimeLimitMs = data.timeLimitMs ?? 600000;
    const adjustedTimeLimitMs = Math.max(
      1000,
      Math.round(baseTimeLimitMs * settings.timeMultiplier),
    );

    return new ScenarioDefinition({
      ...data,
      timeLimitMs: adjustedTimeLimitMs,
    } as Scenario);
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('DifficultyManager name is required.');
    }
    if (!Object.values(Difficulty).includes(this.currentDifficulty)) {
      throw new Error(`Invalid current difficulty "${this.currentDifficulty}".`);
    }
    for (const profile of this.profiles.values()) {
      profile.validate();
    }
  }

  createSnapshot(): DifficultyManagerSnapshot {
    const profiles = this.listProfiles();
    return {
      name: this.name,
      profileCount: this.profiles.size,
      currentDifficulty: this.currentDifficulty,
      profileIds: this.listProfileIds(),
      profiles,
      summary: [
        this.name,
        `difficulty=${this.currentDifficulty}`,
        `${this.profiles.size} profiles`,
      ].join(' | '),
    };
  }
}
