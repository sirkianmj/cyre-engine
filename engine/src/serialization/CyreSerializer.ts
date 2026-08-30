import { SchemaRegistry } from './SchemaRegistry.js';
import type { SerializedEnvelope, SerializedMetadata } from './SerializationTypes.js';

export class CyreSerializer {
  private readonly registry: SchemaRegistry;

  constructor(registry: SchemaRegistry = new SchemaRegistry()) {
    this.registry = registry;
  }

  getRegistry(): SchemaRegistry {
    return this.registry;
  }

  serialize<TData>(
    schemaName: string,
    id: string,
    data: TData,
    options: { version?: number; metadata?: Partial<SerializedMetadata> } = {},
  ): string {
    const version = options.version ?? this.registry.getLatestVersion(schemaName);

    const errors = this.registry.validate(schemaName, data);
    if (errors.length > 0) {
      throw new Error(`Serialization validation failed for "${schemaName}": ${errors.join(', ')}`);
    }

    const metadata: SerializedMetadata = {
      createdAt: new Date().toISOString(),
      engineVersion: '1.0.0',
      ...options.metadata,
    };

    const envelope: SerializedEnvelope<TData> = {
      schema: schemaName,
      version,
      id,
      metadata,
      data,
    };

    return JSON.stringify(envelope, null, 2);
  }

  deserialize<TData = unknown>(json: string): { envelope: SerializedEnvelope<TData>; data: TData } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Serialized data must be valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Serialized data must be a JSON object.');
    }

    const candidate = parsed as Record<string, unknown>;
    const schema = candidate.schema;
    const version = candidate.version;
    const id = candidate.id;
    const metadata = candidate.metadata;
    const data = candidate.data;

    if (typeof schema !== 'string' || schema.trim() === '') {
      throw new Error('Serialized envelope schema is required.');
    }
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      throw new Error('Serialized envelope version must be a positive integer.');
    }
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error('Serialized envelope id is required.');
    }
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Serialized envelope metadata is required.');
    }

    const migrated = this.registry.migrateToLatest(schema, version, data);
    const errors = this.registry.validate(schema, migrated.data);
    if (errors.length > 0) {
      throw new Error(`Deserialization validation failed for "${schema}": ${errors.join(', ')}`);
    }

    return {
      envelope: {
        schema,
        version: migrated.version,
        id,
        metadata: metadata as SerializedMetadata,
        data: migrated.data as TData,
      },
      data: migrated.data as TData,
    };
  }
}
