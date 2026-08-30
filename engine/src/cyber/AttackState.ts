/**
 * AttackState
 * ------------
 * Tracks the current attack stage and maintains a history of stage changes.
 * Stages may only advance forward in the predefined order.
 */

import { AttackStage, ATTACK_STAGE_ORDER, getNextStage, isStageReached } from './AttackStage.js';

export interface AttackStageTransition {
  from: AttackStage;
  to: AttackStage;
  timestamp: number;
}

export class AttackState {
  private current: AttackStage;
  private history: AttackStageTransition[] = [];

  constructor(initialStage: AttackStage = AttackStage.Recon) {
    this.current = initialStage;
  }

  getCurrentStage(): AttackStage {
    return this.current;
  }

  /**
   * Advance to the next stage.
   * @param timestamp Optional timestamp (milliseconds). Defaults to Date.now().
   * @throws Error if no next stage exists.
   */
  advance(timestamp: number = Date.now()): AttackStageTransition {
    const next = getNextStage(this.current);
    if (!next) {
      throw new Error(`Cannot advance beyond the final stage (${this.current}).`);
    }
    const transition: AttackStageTransition = {
      from: this.current,
      to: next,
      timestamp,
    };
    this.current = next;
    this.history.push(transition);
    return transition;
  }

  /**
   * Jump directly to a later stage (must be forward).
   * @throws Error if target stage is not later in the lifecycle.
   */
  setStage(target: AttackStage, timestamp: number = Date.now()): AttackStageTransition {
    const currentIndex = ATTACK_STAGE_ORDER.indexOf(this.current);
    const targetIndex = ATTACK_STAGE_ORDER.indexOf(target);
    if (targetIndex < 0) {
      throw new Error(`Invalid attack stage: ${target}`);
    }
    if (targetIndex <= currentIndex) {
      throw new Error(`Cannot move backwards or to the same stage (current: ${this.current}, target: ${target}).`);
    }
    const transition: AttackStageTransition = {
      from: this.current,
      to: target,
      timestamp,
    };
    this.current = target;
    this.history.push(transition);
    return transition;
  }

  hasReached(stage: AttackStage): boolean {
    return isStageReached(this.current, stage);
  }

  getHistory(): ReadonlyArray<AttackStageTransition> {
    return [...this.history];
  }

  reset(stage: AttackStage = AttackStage.Recon): void {
    this.current = stage;
    this.history.length = 0;
  }

  toJSON(): Record<string, unknown> {
    return {
      currentStage: this.current,
      history: this.history,
    };
  }
}
