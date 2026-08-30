import {
  AttackStage,
  ATTACK_STAGE_ORDER,
  AttackState,
} from '../cyber/index.js';
import { BaseCyberAgent } from './BaseCyberAgent.js';
import type {
  CyberAgentContext,
  CyberAgentDecision,
} from './CyberAgentTypes.js';

export interface AutonomousAttackerOptions {
  id: string;
  name: string;
  attackPath: string[];
  initialStage?: AttackStage;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function isValidAttackStage(value: AttackStage): boolean {
  return ATTACK_STAGE_ORDER.includes(value);
}

export class AutonomousAttackerAgent extends BaseCyberAgent {
  private readonly attackPath: string[];
  private readonly initialStage: AttackStage;
  private readonly attackState: AttackState;
  private pathIndex = 0;

  constructor(options: AutonomousAttackerOptions) {
    assertNonEmpty(options.id, 'AutonomousAttacker id');
    assertNonEmpty(options.name, 'AutonomousAttacker name');
    if (!Array.isArray(options.attackPath) || options.attackPath.length < 2) {
      throw new Error('AutonomousAttacker attackPath must contain at least two nodes.');
    }

    for (const node of options.attackPath) {
      if (typeof node !== 'string' || node.trim() === '') {
        throw new Error('AutonomousAttacker attackPath must contain non-empty strings.');
      }
    }

    if (
      options.initialStage !== undefined &&
      !isValidAttackStage(options.initialStage)
    ) {
      throw new Error(`Invalid initial attack stage "${options.initialStage}".`);
    }

    super(options.id, options.name, 'attacker');

    this.attackPath = [...options.attackPath];
    this.initialStage = options.initialStage ?? AttackStage.Recon;
    this.attackState = new AttackState(this.initialStage);
  }

  getCurrentNode(): string {
    return this.attackPath[this.pathIndex];
  }

  getCurrentStage(): AttackStage {
    return this.attackState.getCurrentStage();
  }

  getAttackPath(): string[] {
    return [...this.attackPath];
  }

  getPathIndex(): number {
    return this.pathIndex;
  }

  getProgress(): {
    currentNode: string;
    currentStage: AttackStage;
    pathIndex: number;
    totalNodes: number;
    remainingNodes: number;
    completed: boolean;
  } {
    return {
      currentNode: this.getCurrentNode(),
      currentStage: this.getCurrentStage(),
      pathIndex: this.pathIndex,
      totalNodes: this.attackPath.length,
      remainingNodes: this.attackPath.length - this.pathIndex - 1,
      completed: this.pathIndex >= this.attackPath.length - 1,
    };
  }

  protected decide(context: CyberAgentContext): CyberAgentDecision | void {
    if (this.pathIndex >= this.attackPath.length - 1) {
      return undefined;
    }

    const sourceId = this.attackPath[this.pathIndex];
    const targetId = this.attackPath[this.pathIndex + 1];
    const nextStage = this.resolveStageForIndex(this.pathIndex + 1);

    if (nextStage !== this.attackState.getCurrentStage()) {
      this.attackState.setStage(nextStage, context.now());
    }

    const action = {
      id: `attack-${nextStage}-${targetId}`,
      type: `attack:${nextStage}`,
      sourceId,
      targetId,
      timestamp: context.now(),
      data: {
        fromNode: sourceId,
        toNode: targetId,
        previousStage: this.attackState.getCurrentStage() === nextStage
          ? this.attackState.getHistory().at(-1)?.from ?? this.initialStage
          : this.initialStage,
        stage: nextStage,
      },
    };

    this.pathIndex += 1;

    return {
      action,
      confidence: 0.9,
      reasoning: `Autonomous attacker moves from ${sourceId} to ${targetId} using stage ${nextStage}.`,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      attackPath: this.getAttackPath(),
      currentStage: this.getCurrentStage(),
      pathIndex: this.pathIndex,
    };
  }

  private resolveStageForIndex(index: number): AttackStage {
    if (index <= 0) return this.initialStage;
    if (index >= this.attackPath.length - 1) {
      return AttackStage.Impact;
    }

    const stageIndex = ATTACK_STAGE_ORDER.indexOf(this.initialStage) + index;
    return ATTACK_STAGE_ORDER[
      Math.min(stageIndex, ATTACK_STAGE_ORDER.length - 1)
    ] ?? AttackStage.Impact;
  }
}
