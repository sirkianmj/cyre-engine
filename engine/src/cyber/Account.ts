/**
 * Account
 * --------
 * Represents a user account with credentials and permissions.
 */

import { CyberEntity } from './CyberEntity.js';

export class Account extends CyberEntity {
  static readonly TYPE = 'Account';

  readonly username: string;
  readonly userId: string;
  readonly passwordHash?: string;

  constructor(
    id: string,
    username: string,
    userId: string,
    options: {
      passwordHash?: string;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, Account.TYPE, username, options.data);
    if (!username || username.trim() === '') {
      throw new Error('Account username must be a non-empty string.');
    }
    if (!userId || userId.trim() === '') {
      throw new Error('Account userId must be a non-empty string.');
    }
    this.username = username;
    this.userId = userId;
    this.passwordHash = options.passwordHash;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      username: this.username,
      userId: this.userId,
      passwordHash: this.passwordHash,
    };
  }
}
