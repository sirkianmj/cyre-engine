import type { SchemaDefinition } from './SerializationTypes.js';

export class SchemaRegistry {
  private readonly schemas = new Map<string, SchemaDefinition>();

  register(definition: SchemaDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Schema name is required.');
    }
    if (this.schemas.has(definition.name)) {
      throw new Error(`Schema "${definition.name}" is already registered.`);
    }
    if (!Number.isInteger(definition.latestVersion) || definition.latestVersion < 1) {
      throw new Error(`Schema "${definition.name}" latestVersion must be a positive integer.`);
    }
    this.schemas.set(definition.name, definition);
  }

  has(name: string): boolean {
    return this.schemas.has(name);
  }

  get(name: string): SchemaDefinition | undefined {
    return this.schemas.get(name);
  }

  getLatestVersion(name: string): number {
    const schema = this.get(name);
    if (!schema) {
      throw new Error(`Unknown schema "${name}".`);
    }
    return schema.latestVersion;
  }

  validate(name: string, data: unknown): string[] {
    const schema = this.get(name);
    if (!schema) {
      throw new Error(`Unknown schema "${name}".`);
    }
    return schema.validate(data);
  }

  migrateToLatest(name: string, version: number, data: unknown): { version: number; data: unknown } {
    const schema = this.get(name);
    if (!schema) {
      throw new Error(`Unknown schema "${name}".`);
    }

    let currentVersion = version;
    let currentData = data;

    while (currentVersion < schema.latestVersion) {
      if (!schema.migrate) {
        throw new Error(`No migration path for schema "${name}" from version ${currentVersion}.`);
      }
      const result = schema.migrate(currentVersion, currentData);
      if (!Number.isInteger(result.version) || result.version <= currentVersion) {
        throw new Error(`Migration for schema "${name}" did not advance the version.`);
      }
      currentVersion = result.version;
      currentData = result.data;
    }

    if (currentVersion > schema.latestVersion) {
      throw new Error(
        `Schema "${name}" version ${currentVersion} exceeds supported version ${schema.latestVersion}.`,
      );
    }

    return { version: currentVersion, data: currentData };
  }
}
