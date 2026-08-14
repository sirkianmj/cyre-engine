/**
 * User
 * -----
 * Represents a human user in the cyber simulation.
 */

import { CyberEntity } from './CyberEntity.js';

export class User extends CyberEntity {
  static readonly TYPE = 'User';

  readonly email?: string;
  readonly role?: string;

  constructor(
    id: string,
    name: string,
    options: {
      email?: string;
      role?: string;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, User.TYPE, name, options.data);
    if (options.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(options.email)) {
        throw new Error('Invalid email address.');
      }
    }
    this.email = options.email;
    this.role = options.role;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      email: this.email,
      role: this.role,
    };
  }
}
