import {
  isCyberAgentRole,
  isCyberAgentStatus,
  type CyberAgent,
  type CyberAgentAction,
  type CyberAgentActionRecord,
  type CyberAgentContext,
  type CyberAgentDecision,
  type CyberAgentRole,
  type CyberAgentStatus,
} from './CyberAgentTypes.js';

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

export abstract class BaseCyberAgent implements CyberAgent {
  readonly id: string;
  readonly name: string;
  readonly role: CyberAgentRole;
  private status: CyberAgentStatus = 'idle';
  private readonly actionLog: CyberAgentActionRecord[] = [];
  private nextSequence = 1;

  constructor(id: string, name: string, role: CyberAgentRole) {
    assertNonEmpty(id, 'CyberAgent id');
    assertNonEmpty(name, 'CyberAgent name');
    if (!isCyberAgentRole(role)) {
      throw new Error(`Invalid cyber agent role "${role}".`);
    }

    this.id = id;
    this.name = name;
    this.role = role;
  }

  getStatus(): CyberAgentStatus {
    return this.status;
  }

  start(context: CyberAgentContext): void {
    this.assertContext(context);
    if (this.status !== 'idle') {
      throw new Error(`CyberAgent "${this.id}" cannot start from status "${this.status}".`);
    }
    this.status = 'active';
  }

  pause(): void {
    if (this.status !== 'active') {
      throw new Error(`CyberAgent "${this.id}" cannot pause from status "${this.status}".`);
    }
    this.status = 'paused';
  }

  resume(): void {
    if (this.status !== 'paused') {
      throw new Error(`CyberAgent "${this.id}" cannot resume from status "${this.status}".`);
    }
    this.status = 'active';
  }

  stop(): void {
    if (this.status !== 'active' && this.status !== 'paused') {
      throw new Error(`CyberAgent "${this.id}" cannot stop from status "${this.status}".`);
    }
    this.status = 'terminated';
  }

  step(context: CyberAgentContext): CyberAgentDecision | void {
    this.assertContext(context);
    if (this.status !== 'active') {
      throw new Error(`CyberAgent "${this.id}" is not active.`);
    }

    const decision = this.decide(context);
    if (decision !== undefined) {
      this.validateDecision(decision);
      context.act(decision.action);
      this.recordAction(decision.action, context.now());
      return deepClone(decision);
    }
    return undefined;
  }

  getActionLog(): CyberAgentActionRecord[] {
    return this.actionLog.map((record) => deepClone(record));
  }

  validate(): void {
    assertNonEmpty(this.id, 'CyberAgent id');
    assertNonEmpty(this.name, 'CyberAgent name');
    if (!isCyberAgentRole(this.role)) {
      throw new Error(`Invalid cyber agent role "${this.role}".`);
    }
    if (!isCyberAgentStatus(this.status)) {
      throw new Error(`Invalid cyber agent status "${this.status}".`);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      status: this.status,
      actionLog: this.getActionLog(),
    };
  }

  protected abstract decide(
    context: CyberAgentContext,
  ): CyberAgentDecision | void;

  protected recordAction(
    action: CyberAgentAction,
    timestamp = Date.now(),
  ): void {
    const record: CyberAgentActionRecord = {
      sequence: this.nextSequence,
      agentId: this.id,
      action: deepClone(action),
      timestamp,
    };
    this.nextSequence += 1;
    this.actionLog.push(record);
  }

  private assertContext(context: CyberAgentContext): void {
    if (!context || typeof context !== 'object') {
      throw new Error('CyberAgentContext is required.');
    }
    if (context.agentId !== this.id) {
      throw new Error(
        `CyberAgentContext agentId "${context.agentId}" does not match agent "${this.id}".`,
      );
    }
    if (context.role !== this.role) {
      throw new Error(
        `CyberAgentContext role "${context.role}" does not match agent role "${this.role}".`,
      );
    }
    if (typeof context.observe !== 'function') {
      throw new Error('CyberAgentContext observe() must be a function.');
    }
    if (typeof context.act !== 'function') {
      throw new Error('CyberAgentContext act() must be a function.');
    }
    if (typeof context.report !== 'function') {
      throw new Error('CyberAgentContext report() must be a function.');
    }
    if (typeof context.now !== 'function') {
      throw new Error('CyberAgentContext now() must be a function.');
    }
  }

  private validateDecision(decision: CyberAgentDecision): void {
    if (!isRecord(decision)) {
      throw new Error('CyberAgentDecision must be an object.');
    }
    if (!isRecord(decision.action)) {
      throw new Error('CyberAgentDecision action must be an object.');
    }
    assertNonEmpty(decision.action.id, 'CyberAgentAction id');
    assertNonEmpty(decision.action.type, 'CyberAgentAction type');
    if (!Number.isFinite(decision.action.timestamp)) {
      throw new Error('CyberAgentAction timestamp must be a finite number.');
    }
    if (
      decision.action.targetId !== undefined &&
      decision.action.targetId.trim() === ''
    ) {
      throw new Error('CyberAgentAction targetId cannot be empty if provided.');
    }
    if (
      decision.action.sourceId !== undefined &&
      decision.action.sourceId.trim() === ''
    ) {
      throw new Error('CyberAgentAction sourceId cannot be empty if provided.');
    }
    if (
      typeof decision.confidence !== 'number' ||
      !Number.isFinite(decision.confidence) ||
      decision.confidence < 0 ||
      decision.confidence > 1
    ) {
      throw new Error('CyberAgentDecision confidence must be between 0 and 1.');
    }
    if (
      decision.reasoning !== undefined &&
      typeof decision.reasoning !== 'string'
    ) {
      throw new Error('CyberAgentDecision reasoning must be a string if provided.');
    }
    if (decision.alternatives !== undefined) {
      if (!Array.isArray(decision.alternatives)) {
        throw new Error('CyberAgentDecision alternatives must be an array.');
      }
      for (const alternative of decision.alternatives) {
        if (!isRecord(alternative)) {
          throw new Error('CyberAgentDecision alternative must be an object.');
        }
        assertNonEmpty(alternative.id, 'CyberAgent alternative action id');
        assertNonEmpty(alternative.type, 'CyberAgent alternative action type');
      }
    }
  }
}
