import {
  GAME_UI_ALERT_SEVERITIES,
  GAME_UI_ALERT_STATUSES,
  GAME_UI_MISSION_STATUSES,
  type GameUIAlertItem,
  type GameUIEvidenceItem,
  type GameUIMissionState,
  type GameUIObjective,
  type GameUITimelineEvent,
} from './GameUIStateTypes.js';

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

export function assertNonNegativeInteger(
  value: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

export function validateGameUIEvidenceItem(item: GameUIEvidenceItem): void {
  if (!isRecord(item)) {
    throw new Error('GameUI evidence item must be an object.');
  }
  assertNonEmptyString(item.id, 'Evidence id');
  assertNonEmptyString(item.title, 'Evidence title');
  assertNonEmptyString(item.type, 'Evidence type');
  if (item.description !== undefined && typeof item.description !== 'string') {
    throw new Error('Evidence description must be a string if provided.');
  }
  if (item.sourceId !== undefined && item.sourceId.trim() === '') {
    throw new Error('Evidence sourceId cannot be empty if provided.');
  }
  if (item.timestamp !== undefined) {
    assertNonNegativeInteger(item.timestamp, 'Evidence timestamp');
  }
  if (item.data !== undefined && !isRecord(item.data)) {
    throw new Error('Evidence data must be an object if provided.');
  }
}

export function validateGameUIAlertItem(alert: GameUIAlertItem): void {
  if (!isRecord(alert)) {
    throw new Error('GameUI alert item must be an object.');
  }
  assertNonEmptyString(alert.id, 'Alert id');
  assertNonEmptyString(alert.title, 'Alert title');
  assertNonEmptyString(alert.description, 'Alert description');
  if (!GAME_UI_ALERT_SEVERITIES.includes(alert.severity)) {
    throw new Error(`Invalid alert severity "${alert.severity}".`);
  }
  if (!GAME_UI_ALERT_STATUSES.includes(alert.status)) {
    throw new Error(`Invalid alert status "${alert.status}".`);
  }
  assertNonNegativeInteger(alert.timestamp, 'Alert timestamp');
  if (alert.sourceId !== undefined && alert.sourceId.trim() === '') {
    throw new Error('Alert sourceId cannot be empty if provided.');
  }
}

export function validateGameUITimelineEvent(
  event: GameUITimelineEvent,
): void {
  if (!isRecord(event)) {
    throw new Error('GameUI timeline event must be an object.');
  }
  assertNonEmptyString(event.id, 'Timeline event id');
  assertNonEmptyString(event.type, 'Timeline event type');
  assertNonNegativeInteger(event.timestamp, 'Timeline event timestamp');
  if (event.sourceId !== undefined && event.sourceId.trim() === '') {
    throw new Error('Timeline event sourceId cannot be empty if provided.');
  }
  if (event.targetId !== undefined && event.targetId.trim() === '') {
    throw new Error('Timeline event targetId cannot be empty if provided.');
  }
  if (event.data !== undefined && !isRecord(event.data)) {
    throw new Error('Timeline event data must be an object if provided.');
  }
}

export function validateGameUIObjective(objective: GameUIObjective): void {
  if (!isRecord(objective)) {
    throw new Error('GameUI objective must be an object.');
  }
  assertNonEmptyString(objective.id, 'Objective id');
  assertNonEmptyString(objective.description, 'Objective description');
  if (objective.type !== undefined && objective.type.trim() === '') {
    throw new Error('Objective type cannot be empty if provided.');
  }
  if (typeof objective.completed !== 'boolean') {
    throw new Error('Objective completed must be a boolean.');
  }
}

export function validateGameUIMissionState(
  mission: GameUIMissionState,
): void {
  if (!isRecord(mission)) {
    throw new Error('GameUI mission state must be an object.');
  }
  assertNonEmptyString(mission.id, 'Mission id');
  assertNonEmptyString(mission.name, 'Mission name');
  if (!GAME_UI_MISSION_STATUSES.includes(mission.status)) {
    throw new Error(`Invalid mission status "${mission.status}".`);
  }
  if (!Array.isArray(mission.objectives)) {
    throw new Error('Mission objectives must be an array.');
  }
  for (const objective of mission.objectives) {
    validateGameUIObjective(objective);
  }
  if (
    mission.timeLimitMs !== undefined &&
    (!Number.isInteger(mission.timeLimitMs) || mission.timeLimitMs <= 0)
  ) {
    throw new Error('Mission timeLimitMs must be a positive integer if provided.');
  }
}
