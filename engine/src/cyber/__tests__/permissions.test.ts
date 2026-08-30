import { describe, it, expect } from 'vitest';
import {
  Privilege,
  Role,
  Session,
  AccessControl,
} from '../index.js';

describe('Privilege', () => {
  it('creates a privilege', () => {
    const p = new Privilege('read:logs', 'Can read logs');
    expect(p.name).toBe('read:logs');
    expect(p.description).toBe('Can read logs');
  });

  it('throws on empty name', () => {
    expect(() => new Privilege('')).toThrow(/non-empty/);
  });
});

describe('Role', () => {
  it('creates a role with privileges', () => {
    const role = new Role('Analyst', ['read:logs', 'view:alerts']);
    expect(role.name).toBe('Analyst');
    expect(role.hasPrivilege('read:logs')).toBe(true);
    expect(role.hasPrivilege('view:alerts')).toBe(true);
    expect(role.getPrivileges()).toEqual(['read:logs', 'view:alerts']);
  });

  it('adds and removes privileges', () => {
    const role = new Role('Engineer');
    role.addPrivileges(['manage:hosts']);
    expect(role.hasPrivilege('manage:hosts')).toBe(true);
    role.removePrivilege('manage:hosts');
    expect(role.hasPrivilege('manage:hosts')).toBe(false);
  });

  it('throws on duplicate removal', () => {
    const role = new Role('Engineer', ['manage:hosts']);
    expect(() => role.removePrivilege('nonexistent')).toThrow(/not assigned/);
  });
});

describe('Session', () => {
  it('creates an active session', () => {
    const session = new Session('s1', 'acc1', 1000);
    expect(session.isActive()).toBe(true);
    expect(session.accountId).toBe('acc1');
    expect(session.startTime).toBe(1000);
  });

  it('terminates a session', () => {
    const session = new Session('s2', 'acc1', 1000);
    session.terminate(2000);
    expect(session.isActive()).toBe(false);
    expect(session.endTime).toBe(2000);
  });

  it('throws on invalid terminate time', () => {
    const session = new Session('s3', 'acc1', 1000);
    expect(() => session.terminate(500)).toThrow(/not less than startTime/);
  });
});

describe('AccessControl', () => {
  it('manages roles and assignments', () => {
    const ac = new AccessControl();
    const analyst = new Role('Analyst', ['read:logs', 'view:alerts']);
    const admin = new Role('Admin', ['manage:all']);
    ac.addRole(analyst);
    ac.addRole(admin);
    ac.assignRole('acc1', 'Analyst');
    ac.assignRole('acc1', 'Admin');

    expect(ac.hasRoleForAccount('acc1', 'Analyst')).toBe(true);
    expect(ac.getRolesForAccount('acc1')).toEqual(['Admin', 'Analyst']);
    expect(ac.accountHasPrivilege('acc1', 'read:logs')).toBe(true);
    expect(ac.accountHasPrivilege('acc1', 'manage:all')).toBe(true);
    expect(ac.accountHasPrivilege('acc1', 'nonexistent')).toBe(false);
  });

  it('removes role from account', () => {
    const ac = new AccessControl();
    ac.addRole(new Role('Analyst', ['read:logs']));
    ac.assignRole('acc1', 'Analyst');
    ac.removeRoleFromAccount('acc1', 'Analyst');
    expect(ac.getRolesForAccount('acc1')).toEqual([]);
    expect(ac.accountHasPrivilege('acc1', 'read:logs')).toBe(false);
  });

  it('removes role globally', () => {
    const ac = new AccessControl();
    const role = new Role('Analyst', ['read:logs']);
    ac.addRole(role);
    ac.assignRole('acc1', 'Analyst');
    ac.removeRole('Analyst');
    expect(ac.hasRole('Analyst')).toBe(false);
    expect(ac.getRolesForAccount('acc1')).toEqual([]);
  });

  it('starts and terminates sessions', () => {
    const ac = new AccessControl();
    ac.startSession('s1', 'acc1', 100);
    expect(ac.isSessionActive('s1')).toBe(true);
    ac.terminateSession('s1', 200);
    expect(ac.isSessionActive('s1')).toBe(false);
    expect(ac.getActiveSessionsForAccount('acc1')).toEqual([]);
  });

  it('throws on duplicate session ID', () => {
    const ac = new AccessControl();
    ac.startSession('s1', 'acc1', 100);
    expect(() => ac.startSession('s1', 'acc1', 200)).toThrow(/already exists/);
  });
});
