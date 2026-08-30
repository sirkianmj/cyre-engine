import type { CyberScenarioDefinition } from './CyberScenarioDefinition.js';

export function serializeCyberScenarioDefinition(
  scenario: CyberScenarioDefinition,
): string {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    throw new Error('Cyber scenario definition must be an object.');
  }

  return JSON.stringify(scenario, null, 2);
}

export function deserializeCyberScenarioDefinition(
  json: string,
): CyberScenarioDefinition {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid cyber scenario JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Cyber scenario JSON must be an object.');
  }

  return parsed as CyberScenarioDefinition;
}
