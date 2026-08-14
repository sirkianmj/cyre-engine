/**
 * AccessControl
 * --------------
 * Manages roles, account-role assignments, and permission checks.
 * Also tracks sessions and account status.
 */

import { Account } from './Account.js';
import { Role } from './Role.js';
import { Session } from './Session.js';

export class AccessControl {
  private roles: Map<string, Role> = new Map();
  private accountRoles: Map<string, Set<string>> = new Map();
  private sessions: Map<string, Session> = new Map();

  /**
   * Add a new role.
   * @throws Error if role already exists.
   */
  addRole(role: Role): void {
    if (this.roles.has(role.name)) {
      throw new Error(`Role "${role.name}" already exists.`);
    }
    this.roles.set(role.name, role);
  }

  hasRole(roleName: string): boolean {
    return this.roles.has(roleName);
  }

  getRole(roleName: string): Role | undefined {
    return this.roles.get(roleName);
  }

  removeRole(roleName: string): void {
    if (!this.roles.has(roleName)) {
      throw new Error(`Role "${roleName}" does not exist.`);
    }
    // Remove role from all accounts
    for (const roles of this.accountRoles.values()) {
      roles.delete(roleName);
    }
    this.roles.delete(roleName);
  }

  /**
   * Assign a role to an account.
   */
  assignRole(accountId: string, roleName: string): void {
    if (!this.roles.has(roleName)) {
      throw new Error(`Role "${roleName}" does not exist.`);
    }
    if (!this.accountRoles.has(accountId)) {
      this.accountRoles.set(accountId, new Set());
    }
    this.accountRoles.get(accountId)!.add(roleName);
  }

  removeRoleFromAccount(accountId: string, roleName: string): void {
    const roles = this.accountRoles.get(accountId);
    if (!roles || !roles.has(roleName)) {
      throw new Error(`Role "${roleName}" is not assigned to account "${accountId}".`);
    }
    roles.delete(roleName);
    if (roles.size === 0) {
      this.accountRoles.delete(accountId);
    }
  }

  getRolesForAccount(accountId: string): string[] {
    return Array.from(this.accountRoles.get(accountId) ?? []).sort();
  }

  /**
   * Check if an account has a specific role.
   */
  hasRoleForAccount(accountId: string, roleName: string): boolean {
    return this.accountRoles.get(accountId)?.has(roleName) ?? false;
  }

  /**
   * Check if an account has a specific privilege via any of its roles.
   */
  accountHasPrivilege(accountId: string, privilegeName: string): boolean {
    const roles = this.accountRoles.get(accountId);
    if (!roles) return false;
    for (const roleName of roles) {
      const role = this.roles.get(roleName);
      if (role && role.hasPrivilege(privilegeName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Start a new session for an account.
   */
  startSession(sessionId: string, accountId: string, startTime: number): Session {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session "${sessionId}" already exists.`);
    }
    const session = new Session(sessionId, accountId, startTime);
    this.sessions.set(sessionId, session);
    return session;
  }

  terminateSession(sessionId: string, endTime: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" does not exist.`);
    }
    session.terminate(endTime);
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  isSessionActive(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.isActive() ?? false;
  }

  getActiveSessionsForAccount(accountId: string): Session[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.accountId === accountId && session.isActive(),
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      roles: Array.from(this.roles.values()).map((r) => r.toJSON()),
      accountRoles: Object.fromEntries(
        Array.from(this.accountRoles.entries()).map(([accountId, roles]) => [
          accountId,
          Array.from(roles).sort(),
        ]),
      ),
      sessions: Array.from(this.sessions.values()).map((s) => s.toJSON()),
    };
  }
}
