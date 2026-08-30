/**
 * Client
 * -------
 * Represents a client workstation or device.
 */

import { Host } from './Host.js';

export class Client extends Host {
  static readonly TYPE = 'Client';

  constructor(
    id: string,
    name: string,
    options: {
      os?: string;
      ipAddress?: string;
      hostname?: string;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, name, {
      ...options,
      entityType: Client.TYPE,
    });
  }
}
