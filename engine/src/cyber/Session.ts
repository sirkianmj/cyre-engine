/**
 * Session
 * --------
 * Represents an authenticated session for an account.
 */

import { CyberEntity } from './CyberEntity.js';

export class Session extends CyberEntity {
  static readonly TYPE = 'Session';

  readonly accountId: string;
  readonly startTime: number;
  readonly endTime?: number;
  private active: boolean;

  constructor(
    id: string,
    accountId: string,
    startTime: number,
    options: {
      endTime?: number;
      active?: boolean;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(id, Session.TYPE, `session-${id}`, options.data);
    if (!accountId || accountId.trim() === '') {
      throw new Error('Session accountId must be a non-empty string.');
    }
    if (!Number.isInteger(startTime) || startTime < 0) {
      throw new Error('Session startTime must be a non-negative integer.');
    }
    if (options.endTime !== undefined) {
      if (!Number.isInteger(options.endTime) || options.endTime < startTime) {
        throw new Error('Session endTime must be an integer not less than startTime.');
      }
    }
    this.accountId = accountId;
    this.startTime = startTime;
    this.endTime = options.endTime;
    this.active = options.active ?? true;
  }

  isActive(): boolean {
    return this.active;
  }

  terminate(endTime: number): void {
    if (!Number.isInteger(endTime) || endTime < this.startTime) {
      throw new Error('Session endTime must be an integer not less than startTime.');
    }
    if (this.endTime !== undefined && endTime < this.endTime) {
      throw new Error('Session endTime cannot be earlier than already set endTime.');
    }
    this.active = false;
    (this as { endTime?: number }).endTime = endTime;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      accountId: this.accountId,
      startTime: this.startTime,
      endTime: this.endTime,
      active: this.active,
    };
  }
}
