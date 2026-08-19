import type {
  ConsoleFamily,
  ConsoleService,
} from './ConsoleArchitectureTypes.js';
import { ConsoleArchitectureProfile } from './ConsoleArchitectureProfile.js';
import { isConsoleFamily, isConsoleService } from './ConsoleArchitectureTypes.js';

export interface ConsoleArchitectureSnapshot {
  name: string;
  profileCount: number;
  familyCounts: Record<string, number>;
  serviceCounts: Record<string, number>;
  profiles: ConsoleArchitectureProfile[];
  summary: string;
}

export interface ConsoleArchitectureOptions {
  name?: string;
}

export class ConsoleArchitecture {
  readonly name: string;
  private readonly profiles = new Map<string, ConsoleArchitectureProfile>();

  constructor(options: ConsoleArchitectureOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('ConsoleArchitecture name cannot be empty if provided.');
    }
    this.name = options.name ?? 'CYRE Console Architecture';
  }

  registerProfile(profile: ConsoleArchitectureProfile): void {
    profile.validate();
    if (this.profiles.has(profile.id)) {
      throw new Error(`Console architecture profile "${profile.id}" is already registered.`);
    }
    this.profiles.set(profile.id, profile.clone());
  }

  unregisterProfile(id: string): void {
    if (!this.profiles.delete(id)) {
      throw new Error(`Console architecture profile "${id}" does not exist.`);
    }
  }

  hasProfile(id: string): boolean {
    return this.profiles.has(id);
  }

  getProfile(id: string): ConsoleArchitectureProfile | undefined {
    const profile = this.profiles.get(id);
    return profile !== undefined ? profile.clone() : undefined;
  }

  listProfiles(): ConsoleArchitectureProfile[] {
    return Array.from(this.profiles.values()).map((profile) => profile.clone());
  }

  listProfileIds(): string[] {
    return Array.from(this.profiles.keys()).sort();
  }

  listProfilesByFamily(family: ConsoleFamily): ConsoleArchitectureProfile[] {
    if (!isConsoleFamily(family)) {
      throw new Error(`Invalid console family "${family}".`);
    }
    return this.listProfiles().filter((profile) => profile.family === family);
  }

  listProfilesByService(service: ConsoleService): ConsoleArchitectureProfile[] {
    if (!isConsoleService(service)) {
      throw new Error(`Invalid console service "${service}".`);
    }
    return this.listProfiles().filter((profile) => profile.services.includes(service));
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('ConsoleArchitecture name is required.');
    }
    for (const profile of this.profiles.values()) {
      profile.validate();
    }
  }

  createSnapshot(): ConsoleArchitectureSnapshot {
    const profiles = this.listProfiles();
    const familyCounts: Record<string, number> = {};
    const serviceCounts: Record<string, number> = {};

    for (const profile of profiles) {
      familyCounts[profile.family] = (familyCounts[profile.family] ?? 0) + 1;
      for (const service of profile.services) {
        serviceCounts[service] = (serviceCounts[service] ?? 0) + 1;
      }
    }

    return {
      name: this.name,
      profileCount: this.profiles.size,
      familyCounts,
      serviceCounts,
      profiles,
      summary: [
        this.name,
        `${this.profiles.size} profiles`,
        `families=${Object.keys(familyCounts).length}`,
        `services=${Object.keys(serviceCounts).length}`,
      ].join(' | '),
    };
  }
}
