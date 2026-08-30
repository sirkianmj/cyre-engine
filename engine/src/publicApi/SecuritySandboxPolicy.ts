export interface SecuritySandboxViolation {
  path: string;
  message: string;
}

export class SecuritySandboxPolicy {
  static validateScenarioInput(input: unknown): SecuritySandboxViolation[] {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return [{ path: 'scenario', message: 'Scenario input must be an object.' }];
    }

    const violations: SecuritySandboxViolation[] = [];

    const record = input as Record<string, unknown>;

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerousKeys) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        violations.push({
          path: 'scenario',
          message: 'Dangerous key "' + key + '" is not allowed.',
        });
      }
    }

    if (typeof record.id !== 'string' || record.id.trim() === '') {
      violations.push({ path: 'scenario.id', message: 'Scenario id is required.' });
    }

    if (typeof record.name !== 'string' || record.name.trim() === '') {
      violations.push({ path: 'scenario.name', message: 'Scenario name is required.' });
    }

    if (!Array.isArray(record.nodes)) {
      violations.push({ path: 'scenario.nodes', message: 'Scenario nodes must be an array.' });
    } else if ((record.nodes as unknown[]).length === 0) {
      violations.push({ path: 'scenario.nodes', message: 'Scenario nodes cannot be empty.' });
    }

    return violations;
  }

  static assertSecureScenario(input: unknown): void {
    const violations = SecuritySandboxPolicy.validateScenarioInput(input);

    if (violations.length > 0) {
      throw new Error(
        'Scenario failed security validation: ' +
          violations.map((violation) => violation.message).join('; '),
      );
    }
  }
}
