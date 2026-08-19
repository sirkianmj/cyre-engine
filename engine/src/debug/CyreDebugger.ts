import type { BaseEvent, EventBus, ManualClock, StateContainer } from '../core/index.js';
import { DebugBreakpoint, type DebugBreakpointOptions } from './DebugBreakpoint.js';
import { createDebugEventRecord, type DebugEventRecord } from './DebugEventRecord.js';

export type CyreDebuggerState = 'idle' | 'running' | 'paused' | 'stopped';

export interface CyreDebuggerOptions {
  name?: string;
  clock?: ManualClock;
  eventBus?: EventBus;
  pauseOnBreakpoint?: boolean;
}

export interface EventQuery {
  type?: string;
  source?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
}

export interface CyreDebuggerSnapshot {
  name: string;
  state: CyreDebuggerState;
  timestamp: number;
  eventCount: number;
  breakpointCount: number;
  entityCount: number;
  stateContainerCount: number;
  lastEvents: DebugEventRecord[];
  breakpoints: Record<string, unknown>[];
  entities: Record<string, unknown>;
  states: Record<string, unknown>;
  summary: string;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class CyreDebugger {
  readonly name: string;
  private state: CyreDebuggerState = 'idle';
  private clock?: ManualClock;
  private readonly eventBus?: EventBus;
  private readonly pauseOnBreakpoint: boolean;
  private readonly breakpoints = new Map<string, DebugBreakpoint>();
  private readonly entities = new Map<string, unknown>();
  private readonly stateContainers = new Map<string, StateContainer<Record<string, unknown>>>();
  private events: DebugEventRecord[] = [];
  private nextSequence = 1;

  constructor(options: CyreDebuggerOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('CyreDebugger name cannot be empty if provided.');
    }
    this.name = options.name ?? 'CYRE Debugger';
    this.clock = options.clock;
    this.eventBus = options.eventBus;
    this.pauseOnBreakpoint = options.pauseOnBreakpoint ?? true;
  }

  start(): void {
    this.ensureNotStopped();
    if (this.state !== 'idle') {
      throw new Error(`Cannot start debugger in state "${this.state}".`);
    }
    this.state = 'running';
  }

  pause(): void {
    if (this.state !== 'running') {
      throw new Error('Debugger must be running before pause.');
    }
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused') {
      throw new Error('Debugger must be paused before resume.');
    }
    this.state = 'running';
  }

  stop(): void {
    if (this.state === 'stopped') {
      throw new Error('Debugger is already stopped.');
    }
    this.state = 'stopped';
  }

  reset(): void {
    this.state = 'idle';
    this.events = [];
    this.nextSequence = 1;
    for (const breakpoint of this.breakpoints.values()) {
      breakpoint.resetHitCount();
    }
  }

  getState(): CyreDebuggerState {
    return this.state;
  }

  isPaused(): boolean {
    return this.state === 'paused';
  }

  setClock(clock: ManualClock): void {
    this.clock = clock;
  }

  getClock(): ManualClock | undefined {
    return this.clock;
  }

  step(ms = 1): number {
    this.ensureNotStopped();
    if (this.clock === undefined) {
      throw new Error('Cannot step debugger without a ManualClock.');
    }
    if (!Number.isFinite(ms) || ms < 0) {
      throw new Error('Debugger step amount must be a non-negative finite number.');
    }

    this.clock.advance(ms);
    const timestamp = this.clock.now();
    this.processEvent({
      type: 'debug:step',
      timestamp,
      source: this.name,
      data: { deltaMs: ms },
    });
    this.state = this.state === 'idle' ? 'paused' : this.state;
    return timestamp;
  }

  addBreakpoint(options: DebugBreakpointOptions): void {
    this.ensureNotStopped();
    const breakpoint = new DebugBreakpoint(options);
    if (this.breakpoints.has(breakpoint.id)) {
      throw new Error(`DebugBreakpoint "${breakpoint.id}" already exists.`);
    }
    this.breakpoints.set(breakpoint.id, breakpoint);
  }

  removeBreakpoint(id: string): void {
    this.ensureNotStopped();
    if (!this.breakpoints.delete(id)) {
      throw new Error(`DebugBreakpoint "${id}" does not exist.`);
    }
  }

  hasBreakpoint(id: string): boolean {
    return this.breakpoints.has(id);
  }

  getBreakpoint(id: string): DebugBreakpoint | undefined {
    return this.breakpoints.get(id);
  }

  listBreakpoints(): DebugBreakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  registerEntity(id: string, entity: unknown): void {
    this.ensureNotStopped();
    if (!id || id.trim() === '') {
      throw new Error('Debugger entity id is required.');
    }
    if (this.entities.has(id)) {
      throw new Error(`Debugger entity "${id}" is already registered.`);
    }
    this.entities.set(id, entity);
  }

  unregisterEntity(id: string): void {
    this.ensureNotStopped();
    if (!this.entities.delete(id)) {
      throw new Error(`Debugger entity "${id}" does not exist.`);
    }
  }

  hasEntity(id: string): boolean {
    return this.entities.has(id);
  }

  inspectEntity(id: string): Record<string, unknown> | unknown {
    const entity = this.entities.get(id);
    if (entity === undefined) {
      throw new Error(`Debugger entity "${id}" does not exist.`);
    }
    if (entity !== null && typeof (entity as { toJSON?: () => unknown }).toJSON === 'function') {
      return (entity as { toJSON: () => unknown }).toJSON() as Record<string, unknown>;
    }
    return deepClone(entity);
  }

  inspectEntities(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [id, entity] of this.entities.entries()) {
      if (entity !== null && typeof (entity as { toJSON?: () => unknown }).toJSON === 'function') {
        result[id] = (entity as { toJSON: () => unknown }).toJSON();
      } else {
        result[id] = deepClone(entity);
      }
    }
    return result;
  }

  registerState(name: string, container: StateContainer<Record<string, unknown>>): void {
    this.ensureNotStopped();
    if (!name || name.trim() === '') {
      throw new Error('Debugger state name is required.');
    }
    if (this.stateContainers.has(name)) {
      throw new Error(`Debugger state "${name}" is already registered.`);
    }
    this.stateContainers.set(name, container);
  }

  unregisterState(name: string): void {
    this.ensureNotStopped();
    if (!this.stateContainers.delete(name)) {
      throw new Error(`Debugger state "${name}" does not exist.`);
    }
  }

  hasState(name: string): boolean {
    return this.stateContainers.has(name);
  }

  inspectState(name: string): Record<string, unknown> {
    const container = this.stateContainers.get(name);
    if (container === undefined) {
      throw new Error(`Debugger state "${name}" does not exist.`);
    }
    return deepClone(container.getAll());
  }

  inspectStates(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [name, container] of this.stateContainers.entries()) {
      result[name] = deepClone(container.getAll());
    }
    return result;
  }

  processEvent(event: BaseEvent): boolean {
    if (!event || typeof event.type !== 'string' || event.type.trim() === '') {
      throw new Error('Debugger processEvent requires an event with non-empty type.');
    }

    const record = createDebugEventRecord(this.nextSequence, event);
    this.nextSequence += 1;
    this.events.push(record);

    let hitAnyBreakpoint = false;

    for (const breakpoint of this.breakpoints.values()) {
      const context = {
        event: record.event,
        breakpointId: breakpoint.id,
        paused: this.state === 'paused',
      };
      const hit = breakpoint.evaluate(record.event, context);
      if (hit) {
        hitAnyBreakpoint = true;
        this.events.push(createDebugEventRecord(this.nextSequence, {
          type: 'debug:breakpoint-hit',
          timestamp: record.event.timestamp,
          source: this.name,
          data: {
            breakpointId: breakpoint.id,
            eventType: record.event.type,
            sequence: record.sequence,
          },
        }));
        this.nextSequence += 1;

        if (this.pauseOnBreakpoint && this.state === 'running') {
          this.state = 'paused';
        }
      }
    }

    return hitAnyBreakpoint;
  }

  queryEvents(query: EventQuery = {}): DebugEventRecord[] {
    if (
      query.type !== undefined &&
      (typeof query.type !== 'string' || query.type.trim() === '')
    ) {
      throw new Error('Debugger event query type must be a non-empty string if provided.');
    }
    if (
      query.source !== undefined &&
      (typeof query.source !== 'string' || query.source.trim() === '')
    ) {
      throw new Error('Debugger event query source must be a non-empty string if provided.');
    }
    if (
      query.fromTimestamp !== undefined &&
      !Number.isFinite(query.fromTimestamp)
    ) {
      throw new Error('Debugger event query fromTimestamp must be a finite number.');
    }
    if (
      query.toTimestamp !== undefined &&
      !Number.isFinite(query.toTimestamp)
    ) {
      throw new Error('Debugger event query toTimestamp must be a finite number.');
    }
    if (
      query.limit !== undefined &&
      (!Number.isInteger(query.limit) || query.limit < 1)
    ) {
      throw new Error('Debugger event query limit must be a positive integer.');
    }

    let records = [...this.events];

    if (query.type !== undefined) {
      records = records.filter((record) => record.event.type === query.type);
    }
    if (query.source !== undefined) {
      records = records.filter((record) => record.event.source === query.source);
    }
    if (query.fromTimestamp !== undefined) {
      records = records.filter((record) => record.event.timestamp >= query.fromTimestamp!);
    }
    if (query.toTimestamp !== undefined) {
      records = records.filter((record) => record.event.timestamp <= query.toTimestamp!);
    }
    if (query.limit !== undefined) {
      records = records.slice(0, query.limit);
    }

    return records.map((record) => deepClone(record));
  }

  getEventCount(): number {
    return this.events.length;
  }

  createSnapshot(): CyreDebuggerSnapshot {
    const lastEvents = this.events.slice(-5).map((record) => deepClone(record));
    const breakpoints = this.listBreakpoints().map((breakpoint) => breakpoint.toJSON());
    const entities = this.inspectEntities();
    const states = this.inspectStates();

    return {
      name: this.name,
      state: this.state,
      timestamp: this.clock?.now() ?? Date.now(),
      eventCount: this.events.length,
      breakpointCount: this.breakpoints.size,
      entityCount: this.entities.size,
      stateContainerCount: this.stateContainers.size,
      lastEvents,
      breakpoints,
      entities,
      states,
      summary: [
        this.name,
        this.state,
        `${this.events.length} events`,
        `${this.breakpoints.size} breakpoints`,
        `${this.entities.size} entities`,
        `${this.stateContainers.size} state containers`,
      ].join(' | '),
    };
  }

  private ensureNotStopped(): void {
    if (this.state === 'stopped') {
      throw new Error('Debugger is stopped.');
    }
  }
}
