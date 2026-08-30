import { isExperimentalAssignmentMethod } from './ExperimentalScenarioTypes.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function assertNonEmptyString(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

export function computeReproducibilityChecksum(content: string): string {
  let hash = 2166136261 >>> 0;
  const bytes = new TextEncoder().encode(content);
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValue(value[key]);
    }
    return sorted;
  }

  return value;
}

export function validateAssignmentMethod(value: string): void {
  if (!isExperimentalAssignmentMethod(value)) {
    throw new Error(`Invalid experimental assignment method "${value}".`);
  }
}
