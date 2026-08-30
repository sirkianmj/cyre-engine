export const MULTIPLAYER_MODES = [
  'cooperative-soc',
  'red-vs-blue',
  'competitive-investigation',
  'asynchronous-cyber-warfare',
] as const;

export type MultiplayerMode = (typeof MULTIPLAYER_MODES)[number];

export function isMultiplayerMode(value: string): value is MultiplayerMode {
  return (MULTIPLAYER_MODES as readonly string[]).includes(value);
}

export const MULTIPLAYER_STATES = [
  'lobby',
  'starting',
  'active',
  'paused',
  'ended',
] as const;

export type MultiplayerSessionState = (typeof MULTIPLAYER_STATES)[number];

export function isMultiplayerSessionState(
  value: string,
): value is MultiplayerSessionState {
  return (MULTIPLAYER_STATES as readonly string[]).includes(value);
}

export const MULTIPLAYER_PLAYER_ROLES = [
  'soc-analyst',
  'incident-responder',
  'threat-hunter',
  'observer',
  'red-team',
  'blue-team',
] as const;

export type MultiplayerPlayerRole = (typeof MULTIPLAYER_PLAYER_ROLES)[number];

export function isMultiplayerPlayerRole(
  value: string,
): value is MultiplayerPlayerRole {
  return (MULTIPLAYER_PLAYER_ROLES as readonly string[]).includes(value);
}

export const MULTIPLAYER_CONNECTION_STATES = [
  'connected',
  'disconnected',
  'reconnecting',
] as const;

export type MultiplayerConnectionState =
  (typeof MULTIPLAYER_CONNECTION_STATES)[number];

export function isMultiplayerConnectionState(
  value: string,
): value is MultiplayerConnectionState {
  return (MULTIPLAYER_CONNECTION_STATES as readonly string[]).includes(value);
}

export interface MultiplayerPlayerInput {
  id: string;
  name: string;
  role: MultiplayerPlayerRole;
  teamId?: string;
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  role: MultiplayerPlayerRole;
  teamId?: string;
  connectionState: MultiplayerConnectionState;
  joinedAt: number;
  sessionId?: string;
}

export interface MultiplayerMessage {
  sequence: number;
  sessionId: string;
  senderId: string;
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface MultiplayerAction {
  sequence: number;
  sessionId: string;
  playerId: string;
  type: string;
  targetId?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface MultiplayerSessionOptions {
  id: string;
  mode: MultiplayerMode;
  capacity?: number;
  name?: string;
  now?: () => number;
}

export interface MultiplayerReplicationSnapshot {
  sessionId: string;
  mode: MultiplayerMode;
  state: MultiplayerSessionState;
  sequence: number;
  playerCount: number;
  messageCount: number;
  actionCount: number;
  players: MultiplayerPlayer[];
  recentMessages: MultiplayerMessage[];
  recentActions: MultiplayerAction[];
  summary: string;
}

export interface MultiplayerSessionManagerSnapshot {
  name: string;
  sessionCount: number;
  sessionIds: string[];
  summary: string;
}
