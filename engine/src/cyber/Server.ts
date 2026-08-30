/**
 * Server
 * -------
 * Represents a server host.
 */

import { Host } from './Host.js';

export class Server extends Host {
  static readonly TYPE = 'Server';

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
      entityType: Server.TYPE,
    });
  }
}
