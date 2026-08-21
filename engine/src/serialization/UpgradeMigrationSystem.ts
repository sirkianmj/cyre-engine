export interface MigrationStep {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(data: unknown): unknown;
}

export interface MigrationPlan {
  readonly schemaName: string;
  readonly latestVersion: number;
  readonly steps: readonly MigrationStep[];
}

export interface UpgradeMigrationResult {
  readonly schemaName: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrated: boolean;
  readonly data: unknown;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isEmptyString(value: string): boolean {
  return value.trim().length === 0;
}

export class UpgradeMigrationSystem {
  private readonly plans = new Map<string, MigrationPlan>();

  register(
    schemaName: string,
    latestVersion: number,
    steps: readonly MigrationStep[] = [],
  ): void {
    if (typeof schemaName !== 'string' || isEmptyString(schemaName)) {
      throw new Error('Migration plan schema name must be a non-empty string.');
    }

    const trimmedName = schemaName.trim();
    if (!isPositiveInteger(latestVersion)) {
      throw new Error(`Migration plan "${trimmedName}" latestVersion must be a positive integer.`);
    }

    if (!Array.isArray(steps)) {
      throw new Error(`Migration plan "${trimmedName}" steps must be an array.`);
    }

    if (this.plans.has(trimmedName)) {
      throw new Error(`Migration plan "${trimmedName}" is already registered.`);
    }

    if (latestVersion === 1) {
      if (steps.length !== 0) {
        throw new Error(
          `Migration plan "${trimmedName}" with latestVersion 1 must not define migration steps.`,
        );
      }

      this.plans.set(trimmedName, {
        schemaName: trimmedName,
        latestVersion,
        steps: [],
      });
      return;
    }

    if (steps.length === 0) {
      throw new Error(
        `Migration plan "${trimmedName}" must define steps to reach version ${latestVersion}.`,
      );
    }

    this.validateStepChain(trimmedName, latestVersion, steps);

    this.plans.set(trimmedName, {
      schemaName: trimmedName,
      latestVersion,
      steps: steps.map((step) => ({ ...step })),
    });
  }

  hasPlan(schemaName: string): boolean {
    return this.plans.has(schemaName.trim());
  }

  listPlans(): string[] {
    return [...this.plans.keys()].sort();
  }

  getPlan(schemaName: string): MigrationPlan {
    const trimmedName = schemaName.trim();
    const plan = this.plans.get(trimmedName);
    if (!plan) {
      throw new Error(`Migration plan "${trimmedName}" is not registered.`);
    }

    return {
      schemaName: plan.schemaName,
      latestVersion: plan.latestVersion,
      steps: plan.steps.map((step) => ({
        fromVersion: step.fromVersion,
        toVersion: step.toVersion,
        migrate: step.migrate,
      })),
    };
  }

  upgrade(
    schemaName: string,
    fromVersion: number,
    data: unknown,
  ): UpgradeMigrationResult {
    const plan = this.getPlan(schemaName);

    if (!isPositiveInteger(fromVersion)) {
      throw new Error(
        `Migration fromVersion for "${plan.schemaName}" must be a positive integer.`,
      );
    }

    if (fromVersion > plan.latestVersion) {
      throw new Error(
        `Migration fromVersion ${fromVersion} exceeds latest version ${plan.latestVersion} for schema "${plan.schemaName}".`,
      );
    }

    if (fromVersion === plan.latestVersion) {
      return {
        schemaName: plan.schemaName,
        fromVersion,
        toVersion: plan.latestVersion,
        migrated: false,
        data,
      };
    }

    let currentVersion = fromVersion;
    let currentData = data;
    let migrated = false;

    while (currentVersion !== plan.latestVersion) {
      const step = plan.steps.find((entry) => entry.fromVersion === currentVersion);
      if (!step) {
        throw new Error(
          `No migration path for schema "${plan.schemaName}" from version ${currentVersion}.`,
        );
      }

      currentData = step.migrate(currentData);
      currentVersion = step.toVersion;
      migrated = true;
    }

    return {
      schemaName: plan.schemaName,
      fromVersion,
      toVersion: currentVersion,
      migrated,
      data: currentData,
    };
  }

  private validateStepChain(
    schemaName: string,
    latestVersion: number,
    steps: readonly MigrationStep[],
  ): void {
    const ordered = [...steps].sort((a, b) => a.fromVersion - b.fromVersion);
    const seenFromVersions = new Set<number>();

    for (const step of ordered) {
      if (!isPositiveInteger(step.fromVersion)) {
        throw new Error(
          `Migration step fromVersion for "${schemaName}" must be a positive integer.`,
        );
      }

      if (!isPositiveInteger(step.toVersion)) {
        throw new Error(
          `Migration step toVersion for "${schemaName}" must be a positive integer.`,
        );
      }

      if (step.toVersion <= step.fromVersion) {
        throw new Error(
          `Migration step fromVersion ${step.fromVersion} toVersion ${step.toVersion} for "${schemaName}" must advance forward.`,
        );
      }

      if (step.toVersion > latestVersion) {
        throw new Error(
          `Migration step toVersion ${step.toVersion} exceeds latest version ${latestVersion} for "${schemaName}".`,
        );
      }

      if (typeof step.migrate !== 'function') {
        throw new Error(
          `Migration step fromVersion ${step.fromVersion} toVersion ${step.toVersion} for "${schemaName}" must provide a migrate function.`,
        );
      }

      if (seenFromVersions.has(step.fromVersion)) {
        throw new Error(
          `Migration plan "${schemaName}" contains duplicate fromVersion ${step.fromVersion}.`,
        );
      }

      seenFromVersions.add(step.fromVersion);
    }

    if (ordered[0].fromVersion !== 1) {
      throw new Error(
        `Migration plan "${schemaName}" must begin from version 1.`,
      );
    }

    if (ordered[ordered.length - 1].toVersion !== latestVersion) {
      throw new Error(
        `Migration plan "${schemaName}" must end at latest version ${latestVersion}.`,
      );
    }

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const current = ordered[index];
      const next = ordered[index + 1];

      if (current.toVersion !== next.fromVersion) {
        throw new Error(
          `Migration plan "${schemaName}" has a broken chain at version ${current.toVersion}.`,
        );
      }
    }
  }
}
