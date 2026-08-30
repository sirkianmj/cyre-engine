/**
 * Host
 * -----
 * Represents a generic computer host in the cyber simulation.
 * Can be extended by Server, Client, etc.
 */

import { CyberEntity } from './CyberEntity.js';
import { validateOptionalIpAddress, validateOptionalHostname } from './validation.js';

export class Host extends CyberEntity {
  static readonly TYPE: string = 'Host';

  readonly os?: string;
  readonly ipAddress?: string;
  readonly hostname?: string;

  constructor(
    id: string,
    name: string,
    options: {
      os?: string;
      ipAddress?: string;
      hostname?: string;
      data?: Record<string, unknown>;
      entityType?: string; // allow subclasses to override type
    } = {},
  ) {
    const type = options.entityType ?? Host.TYPE;
    super(id, type, name, options.data);
    this.os = options.os;
    if (options.ipAddress !== undefined) {
      validateOptionalIpAddress(options.ipAddress);
    }
    this.ipAddress = options.ipAddress;
    if (options.hostname !== undefined) {
      validateOptionalHostname(options.hostname);
    }
    this.hostname = options.hostname;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      os: this.os,
      ipAddress: this.ipAddress,
      hostname: this.hostname,
    };
  }
}
