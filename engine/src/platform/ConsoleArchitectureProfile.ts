import {
  isConsoleFamily,
  isConsoleInputAbstraction,
  isConsoleRenderingAbstraction,
  isConsoleSaveSystem,
  isConsoleService,
  type ConsoleFamily,
  type ConsoleInputAbstraction,
  type ConsoleRenderingAbstraction,
  type ConsoleSaveSystem,
  type ConsoleService,
} from './ConsoleArchitectureTypes.js';
import { PerformanceProfile } from './PerformanceProfile.js';

export interface ConsoleArchitectureProfileOptions {
  id: string;
  name: string;
  family: ConsoleFamily;
  inputAbstraction: ConsoleInputAbstraction;
  renderingAbstraction: ConsoleRenderingAbstraction;
  saveSystem: ConsoleSaveSystem;
  performanceProfile: PerformanceProfile;
  services?: ConsoleService[];
  settings?: Record<string, unknown>;
  description?: string;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeServices(services: ConsoleService[] | undefined): ConsoleService[] {
  if (services === undefined) return [];
  if (!Array.isArray(services)) {
    throw new Error('Console architecture services must be an array.');
  }

  const seen = new Set<ConsoleService>();
  const normalized: ConsoleService[] = [];

  for (const service of services) {
    if (typeof service !== 'string' || !isConsoleService(service)) {
      throw new Error(`Invalid console service "${service}".`);
    }
    if (seen.has(service)) {
      throw new Error(`Console service "${service}" is duplicated.`);
    }
    seen.add(service);
    normalized.push(service);
  }

  return normalized;
}

export class ConsoleArchitectureProfile {
  readonly id: string;
  readonly name: string;
  readonly family: ConsoleFamily;
  readonly inputAbstraction: ConsoleInputAbstraction;
  readonly renderingAbstraction: ConsoleRenderingAbstraction;
  readonly saveSystem: ConsoleSaveSystem;
  readonly performanceProfile: PerformanceProfile;
  readonly services: readonly ConsoleService[];
  readonly settings: Record<string, unknown>;
  readonly description?: string;

  constructor(options: ConsoleArchitectureProfileOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('ConsoleArchitectureProfile id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('ConsoleArchitectureProfile name is required.');
    }
    if (!isConsoleFamily(options.family)) {
      throw new Error(`Invalid console family "${options.family}".`);
    }
    if (!isConsoleInputAbstraction(options.inputAbstraction)) {
      throw new Error(`Invalid console input abstraction "${options.inputAbstraction}".`);
    }
    if (!isConsoleRenderingAbstraction(options.renderingAbstraction)) {
      throw new Error(`Invalid console rendering abstraction "${options.renderingAbstraction}".`);
    }
    if (!isConsoleSaveSystem(options.saveSystem)) {
      throw new Error(`Invalid console save system "${options.saveSystem}".`);
    }
    if (
      options.performanceProfile !== PerformanceProfile.Low &&
      options.performanceProfile !== PerformanceProfile.Medium &&
      options.performanceProfile !== PerformanceProfile.High &&
      options.performanceProfile !== PerformanceProfile.Ultra
    ) {
      throw new Error(`Invalid performance profile "${options.performanceProfile}".`);
    }
    if (options.description !== undefined && typeof options.description !== 'string') {
      throw new Error('Console architecture description must be a string if provided.');
    }
    if (options.settings !== undefined && !isRecord(options.settings)) {
      throw new Error('Console architecture settings must be an object if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.family = options.family;
    this.inputAbstraction = options.inputAbstraction;
    this.renderingAbstraction = options.renderingAbstraction;
    this.saveSystem = options.saveSystem;
    this.performanceProfile = options.performanceProfile;
    this.services = Object.freeze(normalizeServices(options.services));
    this.settings = options.settings !== undefined ? deepClone(options.settings) : {};
    this.description = options.description;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('ConsoleArchitectureProfile id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('ConsoleArchitectureProfile name is required.');
    }
    if (!isConsoleFamily(this.family)) {
      throw new Error(`Invalid console family "${this.family}".`);
    }
    if (!isConsoleInputAbstraction(this.inputAbstraction)) {
      throw new Error(`Invalid console input abstraction "${this.inputAbstraction}".`);
    }
    if (!isConsoleRenderingAbstraction(this.renderingAbstraction)) {
      throw new Error(`Invalid console rendering abstraction "${this.renderingAbstraction}".`);
    }
    if (!isConsoleSaveSystem(this.saveSystem)) {
      throw new Error(`Invalid console save system "${this.saveSystem}".`);
    }
    if (
      this.performanceProfile !== PerformanceProfile.Low &&
      this.performanceProfile !== PerformanceProfile.Medium &&
      this.performanceProfile !== PerformanceProfile.High &&
      this.performanceProfile !== PerformanceProfile.Ultra
    ) {
      throw new Error(`Invalid performance profile "${this.performanceProfile}".`);
    }
    normalizeServices([...this.services]);
  }

  clone(): ConsoleArchitectureProfile {
    return ConsoleArchitectureProfile.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      family: this.family,
      inputAbstraction: this.inputAbstraction,
      renderingAbstraction: this.renderingAbstraction,
      saveSystem: this.saveSystem,
      performanceProfile: this.performanceProfile,
      services: [...this.services],
      settings: deepClone(this.settings),
      description: this.description,
    };
  }

  static fromJSON(data: Record<string, unknown>): ConsoleArchitectureProfile {
    if (!isRecord(data)) {
      throw new Error('ConsoleArchitectureProfile JSON data must be an object.');
    }

    const services = Array.isArray(data.services)
      ? (data.services as unknown[]).map((entry) => entry as ConsoleService)
      : undefined;

    return new ConsoleArchitectureProfile({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      family: typeof data.family === 'string'
        ? (data.family as ConsoleFamily)
        : 'generic',
      inputAbstraction: typeof data.inputAbstraction === 'string'
        ? (data.inputAbstraction as ConsoleInputAbstraction)
        : 'gamepad',
      renderingAbstraction: typeof data.renderingAbstraction === 'string'
        ? (data.renderingAbstraction as ConsoleRenderingAbstraction)
        : '3d',
      saveSystem: typeof data.saveSystem === 'string'
        ? (data.saveSystem as ConsoleSaveSystem)
        : 'persistent',
      performanceProfile: typeof data.performanceProfile === 'string'
        ? (data.performanceProfile as PerformanceProfile)
        : PerformanceProfile.Medium,
      services,
      settings: isRecord(data.settings) ? data.settings : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
    });
  }
}
