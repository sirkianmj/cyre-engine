/**
 * Entity
 * ------
 * Represents a uniquely identifiable object in the engine.
 * Entities have a type and arbitrary data.
 */

export type EntityType = string;

export interface EntityData {
  [key: string]: unknown;
}

export class Entity {
  readonly id: string;
  readonly type: EntityType;
  private data: EntityData;

  constructor(id: string, type: EntityType, data: EntityData = {}) {
    if (!id || id.trim() === '') {
      throw new Error('Entity id must be a non-empty string.');
    }
    if (!type || type.trim() === '') {
      throw new Error('Entity type must be a non-empty string.');
    }
    this.id = id;
    this.type = type;
    this.data = { ...data };
  }

  setData(key: string, value: unknown): void {
    this.data[key] = value;
  }

  getData(key: string): unknown {
    return this.data[key];
  }

  hasData(key: string): boolean {
    return key in this.data;
  }

  removeData(key: string): void {
    delete this.data[key];
  }

  getAllData(): Readonly<EntityData> {
    return { ...this.data };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
    };
  }
}
