import {
  DefensiveAction,
  isDefensiveAction,
} from '../cyber/index.js';
import { MultiplayerSession } from './MultiplayerSession.js';
import {
  isMultiplayerPlayerRole,
  type MultiplayerPlayerInput,
} from './MultiplayerTypes.js';
import {
  RED_VS_BLUE_TEAMS,
  RED_VS_BLUE_PLAYER_ROLES,
  isRedVsBluePlayerRole,
  isRedVsBlueTeam,
  type RedVsBluePlayerRole,
  type RedVsBlueSnapshot,
  type RedVsBlueTeam,
  type RedVsBlueTeamState,
} from './RedVsBlueTypes.js';

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

interface TeamActionRecord {
  playerId: string;
  team: RedVsBlueTeam;
  type: string;
  targetId?: string;
  timestamp: number;
}

export interface RedVsBlueSessionOptions {
  id: string;
  missionId?: string;
  capacity?: number;
  now?: () => number;
}

export class RedVsBlueSession {
  readonly missionId?: string;
  readonly multiplayerSession: MultiplayerSession;
  private readonly nowFn: () => number;
  private redScore = 0;
  private blueScore = 0;
  private readonly redCompletedObjectives = new Set<string>();
  private readonly blueAppliedDefenses = new Set<DefensiveAction>();
  private readonly teamActions: TeamActionRecord[] = [];

  constructor(options: RedVsBlueSessionOptions) {
    if (!isRecord(options)) {
      throw new Error('Red vs Blue session options must be an object.');
    }
    assertNonEmpty(options.id, 'Red vs Blue session id');
    if (options.missionId !== undefined && options.missionId.trim() === '') {
      throw new Error('Red vs Blue missionId cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('Red vs Blue session now must be a function if provided.');
    }

    this.missionId = options.missionId;
    this.nowFn = options.now ?? (() => Date.now());
    this.multiplayerSession = new MultiplayerSession({
      id: options.id,
      mode: 'red-vs-blue',
      capacity: options.capacity,
      now: this.nowFn,
    });
  }

  getSessionId(): string {
    return this.multiplayerSession.id;
  }

  getMultiplayerSession(): MultiplayerSession {
    return this.multiplayerSession;
  }

  joinPlayer(input: MultiplayerPlayerInput): void {
    if (!isRecord(input)) {
      throw new Error('Red vs Blue player input must be an object.');
    }
    if (!isRedVsBluePlayerRole(input.role)) {
      throw new Error(`Invalid Red vs Blue player role "${input.role}".`);
    }

    const team = this.teamForRole(input.role);
    this.multiplayerSession.join({
      ...input,
      teamId: team,
    });
  }

  leavePlayer(playerId: string): void {
    this.multiplayerSession.leave(playerId);
  }

  startSession(): void {
    this.multiplayerSession.start();
  }

  endSession(): void {
    this.multiplayerSession.end();
  }

  completeRedObjective(playerId: string, objectiveId: string): void {
    this.ensureActive();
    this.ensureTeamPlayer(playerId, 'red');
    assertNonEmpty(objectiveId, 'Red team objective id');

    if (this.redCompletedObjectives.has(objectiveId)) {
      throw new Error(`Red team objective "${objectiveId}" is already completed.`);
    }

    this.redCompletedObjectives.add(objectiveId);
    this.redScore += 10;
    this.multiplayerSession.applyAction({
      playerId,
      type: 'red:objective-complete',
      targetId: objectiveId,
      data: { objectiveId, team: 'red' },
    });
    this.recordTeamAction(playerId, 'red', 'objective-complete', objectiveId);
  }

  applyBlueDefense(playerId: string, action: DefensiveAction): void {
    this.ensureActive();
    this.ensureTeamPlayer(playerId, 'blue');
    if (!isDefensiveAction(action)) {
      throw new Error(`Invalid defensive action "${action}".`);
    }
    if (this.blueAppliedDefenses.has(action)) {
      throw new Error(`Blue team defensive action "${action}" has already been applied.`);
    }

    this.blueAppliedDefenses.add(action);
    this.blueScore += 5;
    this.multiplayerSession.applyAction({
      playerId,
      type: `blue:defense-${action}`,
      targetId: action,
      data: { action, team: 'blue' },
    });
    this.recordTeamAction(playerId, 'blue', `defense-${action}`, action);
  }

  advanceRedAttack(playerId: string, sourceNode: string, targetNode: string): void {
    this.ensureActive();
    this.ensureTeamPlayer(playerId, 'red');
    assertNonEmpty(sourceNode, 'Red attack source node');
    assertNonEmpty(targetNode, 'Red attack target node');

    this.redScore += 15;
    this.multiplayerSession.applyAction({
      playerId,
      type: 'red:attack-advance',
      targetId: targetNode,
      data: { sourceNode, targetNode, team: 'red' },
    });
    this.recordTeamAction(playerId, 'red', 'attack-advance', targetNode);
  }

  getScores(): { red: number; blue: number } {
    return {
      red: this.redScore,
      blue: this.blueScore,
    };
  }

  getRedCompletedObjectives(): string[] {
    return Array.from(this.redCompletedObjectives).sort();
  }

  getBlueAppliedDefenses(): DefensiveAction[] {
    return Array.from(this.blueAppliedDefenses).sort();
  }

  getTeamState(team: RedVsBlueTeam): RedVsBlueTeamState {
    if (!isRedVsBlueTeam(team)) {
      throw new Error(`Invalid team "${team}".`);
    }

    const players = this.multiplayerSession.listPlayers().filter(
      (player) => player.teamId === team,
    );

    return {
      team,
      playerIds: players.map((player) => player.id).sort(),
      score: team === 'red' ? this.redScore : this.blueScore,
      completedObjectives:
        team === 'red' ? this.getRedCompletedObjectives() : [],
      appliedDefenses:
        team === 'blue'
          ? this.getBlueAppliedDefenses()
          : [],
    };
  }

  getRecentTeamActions(limit = 20): TeamActionRecord[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Red vs Blue action limit must be a non-negative integer.');
    }
    return this.teamActions.slice(-limit).map((action) => deepClone(action));
  }

  validate(): void {
    if (this.missionId !== undefined && this.missionId.trim() === '') {
      throw new Error('Red vs Blue missionId cannot be empty if provided.');
    }
    this.multiplayerSession.validate();
    for (const action of this.teamActions) {
      if (!action.playerId || !isRedVsBlueTeam(action.team) || !action.type) {
        throw new Error('Red vs Blue session contains an invalid team action.');
      }
    }
  }

  createSnapshot(): RedVsBlueSnapshot {
    const players = this.multiplayerSession.listPlayers();
    const redTeam = this.getTeamState('red');
    const blueTeam = this.getTeamState('blue');
    const recentActions = this.getRecentTeamActions(20);

    return {
      sessionId: this.getSessionId(),
      state: this.multiplayerSession.getState(),
      missionId: this.missionId,
      playerCount: players.length,
      redTeam,
      blueTeam,
      recentActions,
      summary: [
        this.getSessionId(),
        this.missionId ?? 'custom-scenario',
        this.multiplayerSession.getState(),
        `red=${this.redScore}`,
        `blue=${this.blueScore}`,
        `${players.length} players`,
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
        `Red vs Blue session "${this.getSessionId()}" is not active.`,
      );
    }
  }

  private ensureTeamPlayer(playerId: string, team: RedVsBlueTeam): void {
    const player = this.multiplayerSession.getPlayer(playerId);
    if (!player) {
      throw new Error(
        `Player "${playerId}" is not in session "${this.getSessionId()}".`,
      );
    }
    if (player.teamId !== team) {
      throw new Error(
        `Player "${playerId}" is on team "${player.teamId}", not "${team}".`,
      );
    }
  }

  private teamForRole(role: RedVsBluePlayerRole): RedVsBlueTeam {
    if (role === 'red-team') return 'red';
    if (role === 'blue-team') return 'blue';
    return 'observer' as RedVsBlueTeam;
  }

  private recordTeamAction(
    playerId: string,
    team: RedVsBlueTeam,
    type: string,
    targetId?: string,
  ): void {
    this.teamActions.push({
      playerId,
      team,
      type,
      targetId,
      timestamp: this.nowFn(),
    });
  }
}
