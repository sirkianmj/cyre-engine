/**
 * Firewall
 * ---------
 * Represents a firewall appliance.
 */

import { CyberEntity } from './CyberEntity.js';

export class Firewall extends CyberEntity {
  static readonly TYPE = 'Firewall';

  readonly rulesetVersion?: string;

  constructor(
    id: string,
    name: string,
    options: {
      rulesetVersion?: string;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, Firewall.TYPE, name, options.data);
    if (options.rulesetVersion !== undefined && options.rulesetVersion.trim() === '') {
      throw new Error('Firewall rulesetVersion cannot be empty if provided.');
    }
    this.rulesetVersion = options.rulesetVersion;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      rulesetVersion: this.rulesetVersion,
    };
  }
}
