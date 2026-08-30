import type { MultiplayerPlayerRole } from './MultiplayerTypes.js';

export const COOPERATIVE_SOC_ROLES = [
  'soc-analyst',
  'incident-responder',
  'threat-hunter',
  'observer',
] as const;

export type CooperativeSocRole = (typeof COOPERATIVE_SOC_ROLES)[number];

export function isCooperativeSocRole(
  value: string,
): value is CooperativeSocRole {
  return (COOPERATIVE_SOC_ROLES as readonly string[]).includes(value);
}

export interface CooperativeEvidenceAssignment {
  evidenceId: string;
  playerId: string;
  assignedAt: number;
  reviewed: boolean;
  reviewedAt?: number;
}

export interface CooperativeSocSnapshot {
  sessionId: string;
  missionId: string;
  missionStatus: string;
  investigationPhase: string;
  playerCount: number;
  assignmentCount: number;
  reviewedEvidenceCount: number;
  players: Array<{
    id: string;
    name: string;
    role: MultiplayerPlayerRole;
    connectionState: string;
  }>;
  assignments: CooperativeEvidenceAssignment[];
  summary: string;
}
