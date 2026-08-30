import type { BaseEvent } from '../core/index.js';

export interface DebuggerContext {
  event: BaseEvent;
  breakpointId: string;
  hitCount: number;
  paused: boolean;
}

export interface DebugBreakpointOptions {
  id: string;
  eventType?: string;
  enabled?: boolean;
  dataMatches?: Record<string, unknown>;
  condition?: (event: BaseEvent, context: DebuggerContext) => boolean;
  metadata?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function partialMatches(
  actual: Record<string, unknown> | undefined,
  expected: Record<string, unknown>,
): boolean {
  if (actual === undefined) return false;
  return Object.entries(expected).every(
    ([key, value]) => JSON.stringify(actual[key]) === JSON.stringify(value),
  );
}

export class DebugBreakpoint {
  readonly id: string;
  readonly eventType?: string;
  readonly dataMatches?: Record<string, unknown>;
  readonly condition?: (event: BaseEvent, context: DebuggerContext) => boolean;
  readonly metadata?: Record<string, unknown>;
  enabled: boolean;
  private hitCountValue = 0;

  constructor(options: DebugBreakpointOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('DebugBreakpoint id is required.');
    }
    if (options.eventType !== undefined && options.eventType.trim() === '') {
      throw new Error('DebugBreakpoint eventType cannot be empty if provided.');
    }
    if (options.dataMatches !== undefined && !isRecord(options.dataMatches)) {
      throw new Error('DebugBreakpoint dataMatches must be an object if provided.');
    }
    if (options.condition !== undefined && typeof options.condition !== 'function') {
      throw new Error('DebugBreakpoint condition must be a function if provided.');
    }

    this.id = options.id;
    this.eventType = options.eventType;
    this.enabled = options.enabled ?? true;
    this.dataMatches = options.dataMatches !== undefined
      ? deepClone(options.dataMatches)
      : undefined;
    this.condition = options.condition;
    this.metadata = options.metadata !== undefined
      ? deepClone(options.metadata)
      : undefined;
  }

  getHitCount(): number {
    return this.hitCountValue;
  }

  evaluate(event: BaseEvent, context: Omit<DebuggerContext, 'hitCount'>): boolean {
    if (!this.enabled) return false;
    if (this.eventType !== undefined && this.eventType !== '*' && event.type !== this.eventType) {
      return false;
    }
    if (
      this.dataMatches !== undefined &&
      !partialMatches(isRecord(event.data) ? event.data : undefined, this.dataMatches)
    ) {
      return false;
    }

    const fullContext: DebuggerContext = {
      ...context,
      breakpointId: this.id,
      hitCount: this.hitCountValue + 1,
    };

    if (this.condition !== undefined && !this.condition(event, fullContext)) {
      return false;
    }

    this.hitCountValue += 1;
    return true;
  }

  resetHitCount(): void {
    this.hitCountValue = 0;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      eventType: this.eventType,
      enabled: this.enabled,
      dataMatches: this.dataMatches !== undefined ? deepClone(this.dataMatches) : undefined,
      metadata: this.metadata !== undefined ? deepClone(this.metadata) : undefined,
      hitCount: this.hitCountValue,
    };
  }
}
