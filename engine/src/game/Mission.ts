/**
 * Mission
 * --------
 * Represents a playable mission with objectives and a time limit.
 * The mission can be started, objectives can be completed, and the mission
 * will automatically complete when all objectives are done before the time limit.
 */

import { Objective, createObjective } from './Objective.js';
import { MissionStatus } from './MissionStatus.js';

export interface MissionOptions {
  name: string;
  objectives: Objective[];
  timeLimitMs?: number;
  description?: string;
}

export class Mission {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly timeLimitMs?: number;
  private objectives: Map<string, Objective>;
  private status: MissionStatus = MissionStatus.Pending;
  private startTime?: number;
  private endTime?: number;

  constructor(id: string, options: MissionOptions) {
    if (!id || id.trim() === '') {
      throw new Error('Mission id must be a non-empty string.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Mission name must be a non-empty string.');
    }
    if (options.objectives.length === 0) {
      throw new Error('Mission must have at least one objective.');
    }
    if (options.timeLimitMs !== undefined && options.timeLimitMs <= 0) {
      throw new Error('Mission time limit must be positive if provided.');
    }

    this.id = id;
    this.name = options.name;
    this.description = options.description;
    this.timeLimitMs = options.timeLimitMs;
    this.objectives = new Map();
    for (const objective of options.objectives) {
      if (this.objectives.has(objective.id)) {
        throw new Error(`Duplicate objective id "${objective.id}" in mission.`);
      }
      this.objectives.set(objective.id, { ...objective });
    }
  }

  getStatus(): MissionStatus {
    return this.status;
  }

  getObjectives(): Objective[] {
    return Array.from(this.objectives.values());
  }

  getObjective(objectiveId: string): Objective | undefined {
    return this.objectives.get(objectiveId);
  }

  /**
   * Start the mission.
   * @param timestamp Start time in milliseconds (defaults to Date.now()).
   * @throws Error if mission already started or ended.
   */
  start(timestamp: number = Date.now()): void {
    if (this.status !== MissionStatus.Pending) {
      throw new Error(`Cannot start mission in status "${this.status}".`);
    }
    this.startTime = timestamp;
    this.status = MissionStatus.Active;
  }

  /**
   * Mark an objective as completed.
   * @param objectiveId ID of the objective to complete.
   * @param timestamp Completion time in milliseconds (defaults to Date.now()).
   * @throws Error if mission is not active or objective not found.
   */
  completeObjective(objectiveId: string, timestamp: number = Date.now()): void {
    this.ensureActive();
    const objective = this.objectives.get(objectiveId);
    if (!objective) {
      throw new Error(`Objective "${objectiveId}" not found in mission.`);
    }
    if (objective.isCompleted) {
      throw new Error(`Objective "${objectiveId}" is already completed.`);
    }
    objective.isCompleted = true;

    // Check if all objectives are complete
    if (this.areAllObjectivesComplete()) {
      this.completeMission(timestamp);
    }
  }

  /**
   * Fail the mission.
   * @param timestamp Failure time in milliseconds (defaults to Date.now()).
   */
  failMission(timestamp: number = Date.now()): void {
    if (this.status === MissionStatus.Completed || this.status === MissionStatus.Failed) {
      throw new Error(`Cannot fail mission in status "${this.status}".`);
    }
    this.endTime = timestamp;
    this.status = MissionStatus.Failed;
  }

  /**
   * Check if the mission's time limit has been exceeded.
   * If exceeded, the mission is automatically failed.
   * @param currentTime Current time in milliseconds.
   * @returns true if time limit exceeded and mission failed; otherwise false.
   */
  checkTimeLimit(currentTime: number): boolean {
    if (this.status !== MissionStatus.Active || this.timeLimitMs === undefined || this.startTime === undefined) {
      return false;
    }
    if (currentTime - this.startTime > this.timeLimitMs) {
      this.failMission(currentTime);
      return true;
    }
    return false;
  }

  /**
   * Check if the mission is complete (all objectives done).
   */
  isCompleted(): boolean {
    return this.status === MissionStatus.Completed;
  }

  /**
   * Check if the mission failed.
   */
  isFailed(): boolean {
    return this.status === MissionStatus.Failed;
  }

  private areAllObjectivesComplete(): boolean {
    return Array.from(this.objectives.values()).every((objective) => objective.isCompleted);
  }

  private completeMission(timestamp: number): void {
    if (this.status !== MissionStatus.Active) {
      throw new Error(`Cannot complete mission in status "${this.status}".`);
    }
    this.endTime = timestamp;
    this.status = MissionStatus.Completed;
  }

  private ensureActive(): void {
    if (this.status !== MissionStatus.Active) {
      throw new Error(`Mission is not active (current status: "${this.status}").`);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      timeLimitMs: this.timeLimitMs,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      objectives: this.getObjectives(),
    };
  }
}
