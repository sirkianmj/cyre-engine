export const RED_VS_BLUE_TEAMS = [
  'red',
  'blue',
] as const;

export type RedVsBlueTeam = (typeof RED_VS_BLUE_TEAMS)[number];

export function isRedVsBlueTeam(value: string): value is RedVsBlueTeam {
  return (RED_VS_BLUE_TEAMS as readonly string[]).includes(value);
}

export const RED_VS_BLUE_PLAYER_ROLES = [
  'red-team',
  'blue-team',
  'observer',
] as const;

export type RedVsBluePlayerRole = (typeof RED_VS_BLUE_PLAYER_ROLES)[number];

export function isRedVsBluePlayerRole(
  value: string,
): value is RedVsBluePlayerRole {
  return (RED_VS_BLUE_PLAYER_ROLES as readonly string[]).includes(value);
}

export interface RedVsBlueTeamState {
  team: RedVsBlueTeam;
  playerIds: string[];
  score: number;
  completedObjectives: string[];
  appliedDefenses: string[];
}

export interface RedVsBlueSnapshot {
  sessionId: string;
  state: string;
  missionId?: string;
  playerCount: number;
  redTeam: RedVsBlueTeamState;
  blueTeam: RedVsBlueTeamState;
  recentActions: Array<{
    playerId: string;
    team: RedVsBlueTeam;
    type: string;
    targetId?: string;
    timestamp: number;
  }>;
  summary: string;
}
