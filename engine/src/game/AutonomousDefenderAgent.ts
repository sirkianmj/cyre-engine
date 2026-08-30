import {
  DefensiveAction,
  ALL_DEFENSIVE_ACTIONS,
  DefenseState,
  isDefensiveAction,
} from '../cyber/index.js';
import { BaseCyberAgent } from './BaseCyberAgent.js';
import type {
  CyberAgentContext,
  CyberAgentDecision,
} from './CyberAgentTypes.js';

export interface AutonomousDefenderOptions {
  id: string;
  name: string;
  actions?: DefensiveAction[];
  targetId?: string;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export class AutonomousDefenderAgent extends BaseCyberAgent {
  private readonly targetId?: string;
  private readonly plannedActions: DefensiveAction[];
  private readonly defenseState = new DefenseState();
  private actionIndex = 0;

  constructor(options: AutonomousDefenderOptions) {
    assertNonEmpty(options.id, 'AutonomousDefender id');
    assertNonEmpty(options.name, 'AutonomousDefender name');

    const plannedActions = options.actions ?? ALL_DEFENSIVE_ACTIONS;
    if (!Array.isArray(plannedActions) || plannedActions.length === 0) {
      throw new Error('AutonomousDefender actions must be a non-empty array.');
    }

    const seen = new Set<string>();
    for (const action of plannedActions) {
      if (!isDefensiveAction(action)) {
        throw new Error(`Invalid defensive action "${action}".`);
      }
      if (seen.has(action)) {
        throw new Error(`Duplicate defensive action "${action}".`);
      }
      seen.add(action);
    }

    if (options.targetId !== undefined && options.targetId.trim() === '') {
      throw new Error('AutonomousDefender targetId cannot be empty if provided.');
    }

    super(options.id, options.name, 'defender');

    this.targetId = options.targetId;
    this.plannedActions = [...plannedActions];
  }

  getTargetId(): string | undefined {
    return this.targetId;
  }

  getPlannedActions(): DefensiveAction[] {
    return [...this.plannedActions];
  }

  getAppliedActions(): DefensiveAction[] {
    return this.defenseState.getAppliedActions();
  }

  getActionIndex(): number {
    return this.actionIndex;
  }

  isComplete(): boolean {
    return this.actionIndex >= this.plannedActions.length;
  }

  getProgress(): {
    targetId?: string;
    actionIndex: number;
    totalActions: number;
    appliedActions: DefensiveAction[];
    completed: boolean;
  } {
    return {
      targetId: this.targetId,
      actionIndex: this.actionIndex,
      totalActions: this.plannedActions.length,
      appliedActions: this.getAppliedActions(),
      completed: this.isComplete(),
    };
  }

  protected decide(context: CyberAgentContext): CyberAgentDecision | void {
    if (this.actionIndex >= this.plannedActions.length) {
      return undefined;
    }

    const action = this.plannedActions[this.actionIndex];

    if (!this.defenseState.hasApplied(action)) {
      this.defenseState.apply(action, context.now());
    }

    this.actionIndex += 1;

    return {
      action: {
        id: `defense-${action}-${this.actionIndex}`,
        type: `defense:${action}`,
        targetId: this.targetId,
        timestamp: context.now(),
        data: {
          action,
          targetId: this.targetId,
          sequence: this.actionIndex,
        },
      },
      confidence: 0.85,
      reasoning: `Autonomous defender applies ${action}${this.targetId ? ` to ${this.targetId}` : ''}.`,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      targetId: this.targetId,
      plannedActions: this.getPlannedActions(),
      appliedActions: this.getAppliedActions(),
      actionIndex: this.actionIndex,
    };
  }
}
