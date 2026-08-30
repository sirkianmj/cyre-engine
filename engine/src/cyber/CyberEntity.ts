/**
 * CyberEntity
 * ------------
 * Base class for all cybersecurity simulation entities.
 * Extends the core Entity with a human-readable name and additional metadata.
 */

import { Entity, type EntityData } from '../core/index.js';

export abstract class CyberEntity extends Entity {
  readonly name: string;

  protected constructor(id: string, type: string, name: string, data: EntityData = {}) {
    super(id, type, data);
    if (!name || name.trim() === '') {
      throw new Error('CyberEntity name must be a non-empty string.');
    }
    this.name = name;
  }

  /**
   * Returns a serialisable representation of the cyber entity.
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
    };
  }
}
