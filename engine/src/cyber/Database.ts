/**
 * Database
 * ---------
 * Represents a database system or instance.
 */

import { CyberEntity } from './CyberEntity.js';

export class Database extends CyberEntity {
  static readonly TYPE = 'Database';

  readonly dbEngine?: string;
  readonly version?: string;

  constructor(
    id: string,
    name: string,
    options: {
      dbEngine?: string;
      version?: string;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, Database.TYPE, name, options.data);
    this.dbEngine = options.dbEngine;
    this.version = options.version;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      dbEngine: this.dbEngine,
      version: this.version,
    };
  }
}
