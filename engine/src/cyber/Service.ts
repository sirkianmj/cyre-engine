/**
 * Service
 * --------
 * Represents a network service running on a host.
 */

import { CyberEntity } from './CyberEntity.js';

export class Service extends CyberEntity {
  static readonly TYPE = 'Service';

  readonly port: number;
  readonly protocol: 'tcp' | 'udp';
  readonly version?: string;

  constructor(
    id: string,
    name: string,
    port: number,
    protocol: 'tcp' | 'udp' = 'tcp',
    options: {
      version?: string;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, Service.TYPE, name, options.data);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Service port must be an integer between 1 and 65535.');
    }
    this.port = port;
    this.protocol = protocol;
    this.version = options.version;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      port: this.port,
      protocol: this.protocol,
      version: this.version,
    };
  }
}
