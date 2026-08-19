import {
  MissionFactory,
} from './MissionFactory.js';
import {
  MissionRunner,
} from './MissionRunner.js';
import {
  MultiplayerSession,
} from './MultiplayerSession.js';
import type {
  MultiplayerPlayerInput,
} from './MultiplayerTypes.js';
import {
  isMultiplayerPlayerRole,
} from './MultiplayerTypes.js';
import {
  COOPERATIVE_SOC_ROLES,
  isCooperativeSocRole,
  type CooperativeEvidenceAssignment,
  type CooperativeSocSnapshot,
} from './CooperativeSocTypes.js';
import { MissionStatus } from './MissionStatus.js';
import { InvestigationPhase } from './InvestigationPhase.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export interface CooperativeSocSessionOptions {
  id: string;
  missionId: string;
  capacity?: number;
  now?: () => number;
}

export class CooperativeSocSession {
  readonly missionId: string;
  readonly missionRunner: MissionRunner;
  readonly multiplayerSession: MultiplayerSession;
  private readonly nowFn: () => number;
  private readonly assignments = new Map<string, CooperativeEvidenceAssignment>();
  private readonly evidenceIds: Set<string>;

  constructor(options: CooperativeSocSessionOptions) {
    if (!isRecord(options)) {
      throw new Error('Cooperative SOC session options must be an object.');
    }
    assertNonEmpty(options.id, 'Cooperative SOC session id');
    assertNonEmpty(options.missionId, 'Cooperative SOC mission id');

    if (!MissionFactory.has(options.missionId)) {
      throw new Error(`Mission "${options.missionId}" is not registered.`);
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('Cooperative SOC session now must be a function if provided.');
    }

    this.missionId = options.missionId;
    this.nowFn = options.now ?? (() => Date.now());
    this.missionRunner = new MissionRunner(MissionFactory.create(options.missionId));
    this.multiplayerSession = new MultiplayerSession({
      id: options.id,
      mode: 'cooperative-soc',
      capacity: options.capacity,
      now: this.nowFn,
    });

    this.evidenceIds = new Set(
      this.missionRunner.scenario.getData().evidence.map((evidence) => evidence.id),
    );
  }

  getSessionId(): string {
    return this.multiplayerSession.id;
  }

  getMissionRunner(): MissionRunner {
    return this.missionRunner;
  }

  getMultiplayerSession(): MultiplayerSession {
    return this.multiplayerSession;
  }

  getEvidenceIds(): string[] {
    return Array.from(this.evidenceIds).sort();
  }

  joinPlayer(input: MultiplayerPlayerInput): void {
    if (!isRecord(input)) {
      throw new Error('Cooperative SOC player input must be an object.');
    }
    if (!isCooperativeSocRole(input.role)) {
      throw new Error(`Invalid cooperative SOC role "${input.role}".`);
    }
    this.multiplayerSession.join(input);
  }

  leavePlayer(playerId: string): void {
    this.multiplayerSession.leave(playerId);
  }

  startSession(): void {
    this.missionRunner.start();
    this.multiplayerSession.start();
  }

  assignEvidence(playerId: string, evidenceId: string): CooperativeEvidenceAssignment {
    this.ensureActive();
    this.ensurePlayer(playerId);
    this.ensureEvidence(evidenceId);

    if (this.assignments.has(evidenceId)) {
      throw new Error(`Evidence "${evidenceId}" is already assigned.`);
    }

    const assignment: CooperativeEvidenceAssignment = {
      evidenceId,
      playerId,
      assignedAt: this.nowFn(),
      reviewed: false,
    };

    this.assignments.set(evidenceId, assignment);
    this.multiplayerSession.applyAction({
      playerId,
      type: 'evidence:assign',
      targetId: evidenceId,
      data: { evidenceId, playerId },
    });

    return deepClone(assignment);
  }

  reviewEvidence(playerId: string, evidenceId: string): CooperativeEvidenceAssignment {
    this.ensureActive();
    this.ensurePlayer(playerId);
    this.ensureEvidence(evidenceId);

    const assignment = this.assignments.get(evidenceId);
    if (!assignment) {
      throw new Error(`Evidence "${evidenceId}" is not assigned.`);
    }
    if (assignment.playerId !== playerId) {
      throw new Error(
        `Evidence "${evidenceId}" is assigned to player "${assignment.playerId}", not "${playerId}".`,
      );
    }
    if (assignment.reviewed) {
      throw new Error(`Evidence "${evidenceId}" has already been reviewed.`);
    }

    const updated: CooperativeEvidenceAssignment = {
      ...assignment,
      reviewed: true,
      reviewedAt: this.nowFn(),
    };
    this.assignments.set(evidenceId, updated);

    this.multiplayerSession.applyAction({
      playerId,
      type: 'evidence:review',
      targetId: evidenceId,
      data: { evidenceId, playerId },
    });

    return deepClone(updated);
  }

  formHypothesis(playerId: string, description: string): void {
    this.ensureActive();
    this.ensurePlayer(playerId);
    assertNonEmpty(description, 'Hypothesis description');

    this.missionRunner.formHypothesis(description);
    this.multiplayerSession.applyAction({
      playerId,
      type: 'investigation:hypothesis',
      data: { description, playerId },
    });
  }

  identifyAttackPath(playerId: string, source: string, target: string): void {
    this.ensureActive();
    this.ensurePlayer(playerId);
    assertNonEmpty(source, 'Attack path source');
    assertNonEmpty(target, 'Attack path target');

    this.missionRunner.identifyAttackPath(source, target);
    this.multiplayerSession.applyAction({
      playerId,
      type: 'investigation:attack-path',
      data: { source, target, playerId },
    });
  }

  containIncident(playerId: string): void {
    this.ensureActive();
    this.ensurePlayer(playerId);

    this.missionRunner.containIncident();
    this.multiplayerSession.applyAction({
      playerId,
      type: 'defense:contain',
      data: { playerId },
    });
  }

  recoverIncident(playerId: string): void {
    this.ensureActive();
    this.ensurePlayer(playerId);

    this.missionRunner.recoverIncident();
    this.multiplayerSession.applyAction({
      playerId,
      type: 'defense:recover',
      data: { playerId },
    });
  }

  completeInvestigation(playerId?: string): void {
    this.ensureActive();
    const actionPlayerId = playerId ?? this.getFirstPlayerId();
    if (!actionPlayerId) {
      throw new Error('Cannot complete cooperative SOC investigation without an assigned player.');
    }
    this.ensurePlayer(actionPlayerId);
    this.missionRunner.completeMission();
    this.multiplayerSession.applyAction({
      playerId: actionPlayerId,
      type: 'investigation:complete',
      data: { playerId: actionPlayerId },
    });
    this.multiplayerSession.end();
  }

  getAssignments(): CooperativeEvidenceAssignment[] {
    return Array.from(this.assignments.values())
      .map((assignment) => deepClone(assignment))
      .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  }

  getAssignment(evidenceId: string): CooperativeEvidenceAssignment | undefined {
    const assignment = this.assignments.get(evidenceId);
    return assignment !== undefined ? deepClone(assignment) : undefined;
  }

  getReviewedEvidenceCount(): number {
    return Array.from(this.assignments.values()).filter(
      (assignment) => assignment.reviewed,
    ).length;
  }

  validate(): void {
    if (!this.missionId || !MissionFactory.has(this.missionId)) {
      throw new Error(`Cooperative SOC mission "${this.missionId}" is not registered.`);
    }
    this.multiplayerSession.validate();
    for (const assignment of this.assignments.values()) {
      if (!assignment.evidenceId || !assignment.playerId) {
        throw new Error('Cooperative SOC session contains an invalid evidence assignment.');
      }
    }
  }

  createSnapshot(): CooperativeSocSnapshot {
    const players = this.multiplayerSession.listPlayers().map((player) => ({
      id: player.id,
      name: player.name,
      role: player.role,
      connectionState: player.connectionState,
    }));

    const assignments = this.getAssignments();

    return {
      sessionId: this.getSessionId(),
      missionId: this.missionId,
      missionStatus: this.missionRunner.getMissionStatus(),
      investigationPhase: this.missionRunner.investigation.getPhase(),
      playerCount: players.length,
      assignmentCount: assignments.length,
      reviewedEvidenceCount: this.getReviewedEvidenceCount(),
      players,
      assignments,
      summary: [
        this.getSessionId(),
        this.missionId,
        this.missionRunner.getMissionStatus(),
        this.missionRunner.investigation.getPhase(),
        `${players.length} players`,
        `${assignments.length}/${this.evidenceIds.size} assigned`,
      ].join(' | '),
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      ...this.createSnapshot(),
      multiplayerSession: this.multiplayerSession.toJSON(),
    };
  }

  private ensureActive(): void {
    if (this.multiplayerSession.getState() !== 'active') {
      throw new Error(
        `Cooperative SOC session "${this.getSessionId()}" is not active.`,
      );
    }
  }

  private ensurePlayer(playerId: string): void {
    if (!this.multiplayerSession.getPlayer(playerId)) {
      throw new Error(
        `Player "${playerId}" is not in session "${this.getSessionId()}".`,
      );
    }
  }

  private getFirstPlayerId(): string | undefined {
    return this.multiplayerSession.listPlayers()[0]?.id;
  }

  private ensureEvidence(evidenceId: string): void {
    if (!this.evidenceIds.has(evidenceId)) {
      throw new Error(
        `Evidence "${evidenceId}" is not part of mission "${this.missionId}".`,
      );
    }
  }
}
