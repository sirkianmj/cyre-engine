import { describe, expect, it } from 'vitest';
import { UpgradeMigrationSystem } from '../UpgradeMigrationSystem.js';

interface TestData {
  value: number;
  migrated?: string[];
}

describe('UpgradeMigrationSystem', () => {
  it('migrates data through a complete version chain', () => {
    const system = new UpgradeMigrationSystem();

    system.register('cyre.project', 3, [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate(data) {
          const record = data as TestData;
          return { ...record, migrated: [...(record.migrated ?? []), 'v1-to-v2'] };
        },
      },
      {
        fromVersion: 2,
        toVersion: 3,
        migrate(data) {
          const record = data as TestData;
          return { ...record, migrated: [...(record.migrated ?? []), 'v2-to-v3'] };
        },
      },
    ]);

    const result = system.upgrade('cyre.project', 1, { value: 42 });

    expect(result.toVersion).toBe(3);
    expect(result.migrated).toBe(true);
    expect((result.data as TestData).migrated).toEqual(['v1-to-v2', 'v2-to-v3']);
    expect((result.data as TestData).value).toBe(42);
  });

  it('returns unchanged data when already at latest', () => {
    const system = new UpgradeMigrationSystem();
    system.register('cyre.project', 1);

    const result = system.upgrade('cyre.project', 1, { value: 7 });

    expect(result.migrated).toBe(false);
    expect(result.toVersion).toBe(1);
    expect(result.data).toEqual({ value: 7 });
  });

  it('supports migrating from an intermediate version', () => {
    const system = new UpgradeMigrationSystem();
    system.register('cyre.scenario', 3, [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: (data) => ({ ...(data as Record<string, unknown>), step: 2 }),
      },
      {
        fromVersion: 2,
        toVersion: 3,
        migrate: (data) => ({ ...(data as Record<string, unknown>), step: 3 }),
      },
    ]);

    const result = system.upgrade('cyre.scenario', 2, { step: 1 });

    expect(result.fromVersion).toBe(2);
    expect(result.toVersion).toBe(3);
    expect((result.data as { step: number }).step).toBe(3);
  });

  it('throws when fromVersion exceeds latest version', () => {
    const system = new UpgradeMigrationSystem();
    system.register('cyre.project', 3, [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: (data) => data,
      },
      {
        fromVersion: 2,
        toVersion: 3,
        migrate: (data) => data,
      },
    ]);

    expect(() => system.upgrade('cyre.project', 4, {})).toThrow(/exceeds latest version/);
  });

  it('registers and lists plans', () => {
    const system = new UpgradeMigrationSystem();
    system.register('alpha', 1);
    system.register('beta', 2, [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: (data) => data,
      },
    ]);

    expect(system.hasPlan('alpha')).toBe(true);
    expect(system.hasPlan('missing')).toBe(false);
    expect(system.listPlans()).toEqual(['alpha', 'beta']);
  });

  it('rejects duplicate plan registration', () => {
    const system = new UpgradeMigrationSystem();
    system.register('cyre.project', 1);

    expect(() => system.register('cyre.project', 1)).toThrow(/already registered/);
  });

  it('rejects a plan with broken migration chain', () => {
    const system = new UpgradeMigrationSystem();

    expect(() =>
      system.register('cyre.project', 4, [
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (data) => data,
        },
        {
          fromVersion: 3,
          toVersion: 4,
          migrate: (data) => data,
        },
      ]),
    ).toThrow(/broken chain/);
  });

  it('rejects a plan with duplicate fromVersion steps', () => {
    const system = new UpgradeMigrationSystem();

    expect(() =>
      system.register('cyre.project', 3, [
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (data) => data,
        },
        {
          fromVersion: 1,
          toVersion: 3,
          migrate: (data) => data,
        },
      ]),
    ).toThrow(/duplicate fromVersion/);
  });

  it('rejects a plan that does not begin at version 1', () => {
    const system = new UpgradeMigrationSystem();

    expect(() =>
      system.register('cyre.project', 3, [
        {
          fromVersion: 2,
          toVersion: 3,
          migrate: (data) => data,
        },
      ]),
    ).toThrow(/must begin from version 1/);
  });
});
