export const GAME_UI_ALERT_SEVERITIES = [
  'info',
  'low',
  'medium',
  'high',
  'critical',
] as const;

export type GameUIAlertSeverity = (typeof GAME_UI_ALERT_SEVERITIES)[number];

export function isGameUIAlertSeverity(
  value: string,
): value is GameUIAlertSeverity {
  return (GAME_UI_ALERT_SEVERITIES as readonly string[]).includes(value);
}

export const GAME_UI_ALERT_STATUSES = [
  'new',
  'acknowledged',
  'investigating',
  'contained',
  'recovered',
  'resolved',
  'false_positive',
] as const;

export type GameUIAlertStatus = (typeof GAME_UI_ALERT_STATUSES)[number];

export function isGameUIAlertStatus(value: string): value is GameUIAlertStatus {
  return (GAME_UI_ALERT_STATUSES as readonly string[]).includes(value);
}

export const GAME_UI_MISSION_STATUSES = [
  'pending',
  'active',
  'completed',
  'failed',
] as const;

export type GameUIMissionStatus = (typeof GAME_UI_MISSION_STATUSES)[number];

export function isGameUIMissionStatus(
  value: string,
): value is GameUIMissionStatus {
  return (GAME_UI_MISSION_STATUSES as readonly string[]).includes(value);
}

export interface GameUIEvidenceItem {
  id: string;
  title: string;
  type: string;
  description?: string;
  sourceId?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface GameUIAlertItem {
  id: string;
  title: string;
  description: string;
  severity: GameUIAlertSeverity;
  status: GameUIAlertStatus;
  timestamp: number;
  sourceId?: string;
}

export interface GameUITimelineEvent {
  id: string;
  type: string;
  timestamp: number;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface GameUIObjective {
  id: string;
  description: string;
  type?: string;
  completed: boolean;
}

export interface GameUIMissionState {
  id: string;
  name: string;
  description?: string;
  status: GameUIMissionStatus;
  objectives: GameUIObjective[];
  timeLimitMs?: number;
}

export interface GameUIWorkspaceData {
  evidence: GameUIEvidenceItem[];
  alerts: GameUIAlertItem[];
  timeline: GameUITimelineEvent[];
  mission?: GameUIMissionState;
}
