import { GameIdentity } from './GameIdentity.js';
import { isGameTargetPlatform, type GameTargetPlatform } from './GameIdentityTypes.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface GameIdentityRegistrySnapshot {
  name: string;
  identityCount: number;
  platformCounts: Record<string, number>;
  identities: GameIdentity[];
  summary: string;
}

export class GameIdentityRegistry {
  readonly name: string;
  private readonly identities = new Map<string, GameIdentity>();

  constructor(name = 'CYRE Game Identity Registry') {
    if (!name || name.trim() === '') {
      throw new Error('GameIdentityRegistry name is required.');
    }
    this.name = name;
  }

  register(identity: GameIdentity): void {
    identity.validate();
    if (this.identities.has(identity.getId())) {
      throw new Error(`GameIdentity "${identity.getId()}" is already registered.`);
    }
    this.identities.set(identity.getId(), identity.clone());
  }

  unregister(id: string): void {
    if (!this.identities.delete(id)) {
      throw new Error(`GameIdentity "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.identities.has(id);
  }

  get(id: string): GameIdentity | undefined {
    const identity = this.identities.get(id);
    return identity !== undefined ? identity.clone() : undefined;
  }

  list(): GameIdentity[] {
    return Array.from(this.identities.values()).map((identity) => identity.clone());
  }

  listIds(): string[] {
    return Array.from(this.identities.keys()).sort();
  }

  listByPlatform(platform: GameTargetPlatform): GameIdentity[] {
    if (!isGameTargetPlatform(platform)) {
      throw new Error(`Invalid game target platform "${platform}".`);
    }
    return this.list().filter((identity) => identity.getTargetPlatforms().includes(platform));
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('GameIdentityRegistry name is required.');
    }
    for (const identity of this.identities.values()) {
      identity.validate();
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      identities: this.list().map((identity) => identity.toJSON()),
    };
  }

  static fromJSON(data: Record<string, unknown>): GameIdentityRegistry {
    if (!isRecord(data)) {
      throw new Error('GameIdentityRegistry JSON data must be an object.');
    }

    const registry = new GameIdentityRegistry(
      typeof data.name === 'string' ? data.name : 'CYRE Game Identity Registry',
    );
    const rawIdentities = Array.isArray(data.identities)
      ? (data.identities as Record<string, unknown>[])
      : [];

    for (const rawIdentity of rawIdentities) {
      registry.register(GameIdentity.fromJSON(rawIdentity));
    }

    return registry;
  }

  createSnapshot(): GameIdentityRegistrySnapshot {
    const identities = this.list();
    const platformCounts: Record<string, number> = {};

    for (const identity of identities) {
      for (const platform of identity.getTargetPlatforms()) {
        platformCounts[platform] = (platformCounts[platform] ?? 0) + 1;
      }
    }

    return {
      name: this.name,
      identityCount: this.identities.size,
      platformCounts,
      identities,
      summary: [
        this.name,
        `${this.identities.size} identities`,
        `platforms=${Object.keys(platformCounts).length}`,
      ].join(' | '),
    };
  }
}
