/**
 * Router
 * -------
 * Represents a network router.
 */

import { CyberEntity } from './CyberEntity.js';
import { validateOptionalIpAddress } from './validation.js';

export class Router extends CyberEntity {
  static readonly TYPE = 'Router';

  readonly ipAddress?: string;
  readonly interfaces?: string[];

  constructor(
    id: string,
    name: string,
    options: {
      ipAddress?: string;
      interfaces?: string[];
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, Router.TYPE, name, options.data);
    if (options.ipAddress !== undefined) {
      validateOptionalIpAddress(options.ipAddress);
    }
    this.ipAddress = options.ipAddress;
    if (options.interfaces !== undefined) {
      if (!Array.isArray(options.interfaces)) {
        throw new Error('Router interfaces must be an array of strings.');
      }
      options.interfaces.forEach((iface) => {
        if (typeof iface !== 'string' || iface.trim() === '') {
          throw new Error('Router interface must be a non-empty string.');
        }
      });
    }
    this.interfaces = options.interfaces;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ipAddress: this.ipAddress,
      interfaces: this.interfaces,
    };
  }
}
