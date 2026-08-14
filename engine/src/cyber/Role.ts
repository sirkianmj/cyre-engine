/**
 * Role
 * -----
 * Represents a named set of privileges.
 */

import { Privilege } from './Privilege.js';

export class Role {
  readonly name: string;
  private privileges: Set<string> = new Set();

  constructor(name: string, privileges: (Privilege | string)[] = []) {
    if (!name || name.trim() === '') {
      throw new Error('Role name must be a non-empty string.');
    }
    this.name = name;
    this.addPrivileges(privileges);
  }

  addPrivileges(privileges: (Privilege | string)[]): void {
    for (const p of privileges) {
      const privilegeName = typeof p === 'string' ? p : p.name;
      if (!privilegeName || privilegeName.trim() === '') {
        throw new Error('Privilege name cannot be empty.');
      }
      this.privileges.add(privilegeName);
    }
  }

  removePrivilege(privilegeName: string): void {
    if (!this.privileges.has(privilegeName)) {
      throw new Error(`Privilege "${privilegeName}" is not assigned to role "${this.name}".`);
    }
    this.privileges.delete(privilegeName);
  }

  hasPrivilege(privilegeName: string): boolean {
    return this.privileges.has(privilegeName);
  }

  getPrivileges(): string[] {
    return Array.from(this.privileges).sort();
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      privileges: this.getPrivileges(),
    };
  }
}
