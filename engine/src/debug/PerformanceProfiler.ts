export interface ProfilerMemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss?: number;
}

export interface ProfilerSectionSnapshot {
  id: string;
  name: string;
  state: 'idle' | 'running' | 'stopped';
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ProfilerOperationStats {
  name: string;
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  lastMs?: number;
  lastMetadata?: Record<string, unknown>;
}

export interface ProfilerEventRecord {
  type: string;
  timestamp: number;
  sequence: number;
}

export interface PerformanceProfileSnapshot {
  name: string;
  timestamp: number;
  cpuTimeMs: number;
  sectionCount: number;
  activeSectionCount: number;
  operationCount: number;
  eventCount: number;
  eventTypeCounts: Record<string, number>;
  memory: ProfilerMemoryUsage;
  sections: ProfilerSectionSnapshot[];
  operations: ProfilerOperationStats[];
  recentEvents: ProfilerEventRecord[];
  summary: string;
}

export interface PerformanceProfilerOptions {
  name?: string;
  now?: () => number;
  getMemoryUsage?: () => ProfilerMemoryUsage;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultMemoryUsage(): ProfilerMemoryUsage {
  const mem = (globalThis as { process?: { memoryUsage?: () => NodeJS.MemoryUsage } })
    .process?.memoryUsage?.();

  return {
    heapUsed: mem?.heapUsed ?? 0,
    heapTotal: mem?.heapTotal ?? 0,
    external: mem?.external ?? 0,
    arrayBuffers: mem?.arrayBuffers ?? 0,
    rss: mem?.rss ?? undefined,
  };
}

interface SectionState {
  id: string;
  name: string;
  state: 'idle' | 'running' | 'stopped';
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

interface OperationState {
  name: string;
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  lastMs?: number;
  lastMetadata?: Record<string, unknown>;
}

const MAX_EVENT_RETENTION = 1000;

export class PerformanceProfiler {
  readonly name: string;
  private readonly nowFn: () => number;
  private readonly getMemoryUsageFn: () => ProfilerMemoryUsage;
  private readonly sections = new Map<string, SectionState>();
  private readonly operations = new Map<string, OperationState>();
  private events: ProfilerEventRecord[] = [];
  private nextEventSequence = 1;
  private totalCpuTimeMs = 0;

  constructor(options: PerformanceProfilerOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('PerformanceProfiler name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('PerformanceProfiler now must be a function if provided.');
    }
    if (options.getMemoryUsage !== undefined && typeof options.getMemoryUsage !== 'function') {
      throw new Error('PerformanceProfiler getMemoryUsage must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Performance Profiler';
    this.nowFn = options.now ?? (() => Date.now());
    this.getMemoryUsageFn = options.getMemoryUsage ?? defaultMemoryUsage;
  }

  now(): number {
    return this.nowFn();
  }

  startSection(name: string, metadata?: Record<string, unknown>): void {
    this.assertNonEmptyName(name, 'Profiler section name');
    if (this.sections.has(name)) {
      throw new Error(`Profiler section "${name}" already exists.`);
    }

    this.sections.set(name, {
      id: name,
      name,
      state: 'running',
      startTime: this.now(),
      metadata: metadata !== undefined ? deepClone(metadata) : undefined,
    });
  }

  endSection(name: string, metadata?: Record<string, unknown>): number {
    this.assertNonEmptyName(name, 'Profiler section name');
    const section = this.sections.get(name);
    if (section === undefined) {
      throw new Error(`Profiler section "${name}" does not exist.`);
    }
    if (section.state !== 'running') {
      throw new Error(`Profiler section "${name}" is not running.`);
    }

    const endTime = this.now();
    const startTime = section.startTime ?? endTime;
    const durationMs = endTime - startTime;

    if (durationMs < 0) {
      throw new Error(`Profiler section "${name}" ended with negative duration.`);
    }

    section.state = 'stopped';
    section.endTime = endTime;
    section.durationMs = durationMs;
    if (metadata !== undefined) {
      section.metadata = {
        ...(section.metadata ?? {}),
        ...deepClone(metadata),
      };
    }

    this.totalCpuTimeMs += durationMs;
    return durationMs;
  }

  getSection(name: string): ProfilerSectionSnapshot | undefined {
    const section = this.sections.get(name);
    return section !== undefined ? deepClone(section) : undefined;
  }

  listSections(): ProfilerSectionSnapshot[] {
    return Array.from(this.sections.values()).map((section) => deepClone(section));
  }

  hasSection(name: string): boolean {
    return this.sections.has(name);
  }

  isSectionRunning(name: string): boolean {
    return this.sections.get(name)?.state === 'running';
  }

  recordOperation(
    name: string,
    durationMs: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.assertNonEmptyName(name, 'Profiler operation name');
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('Profiler operation durationMs must be a non-negative finite number.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('Profiler operation metadata must be an object if provided.');
    }

    const current = this.operations.get(name);
    if (current === undefined) {
      this.operations.set(name, {
        name,
        count: 1,
        totalMs: durationMs,
        minMs: durationMs,
        maxMs: durationMs,
        lastMs: durationMs,
        lastMetadata: metadata !== undefined ? deepClone(metadata) : undefined,
      });
    } else {
      current.count += 1;
      current.totalMs += durationMs;
      current.minMs = Math.min(current.minMs, durationMs);
      current.maxMs = Math.max(current.maxMs, durationMs);
      current.lastMs = durationMs;
      current.lastMetadata = metadata !== undefined ? deepClone(metadata) : undefined;
    }

    this.totalCpuTimeMs += durationMs;
  }

  getOperation(name: string): ProfilerOperationStats | undefined {
    const operation = this.operations.get(name);
    return operation !== undefined ? deepClone(operation) : undefined;
  }

  listOperations(): ProfilerOperationStats[] {
    return Array.from(this.operations.values()).map((operation) => deepClone(operation));
  }

  /**
   * Measure a synchronous function and record its duration as an operation.
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    this.assertNonEmptyName(name, 'Profiler operation name');
    if (typeof fn !== 'function') {
      throw new Error('Profiler measure requires a function.');
    }

    const startTime = this.now();
    const result = fn();
    const endTime = this.now();
    this.recordOperation(name, endTime - startTime, metadata);
    return result;
  }

  recordEvent(type: string, timestamp?: number): void {
    this.assertNonEmptyName(type, 'Profiler event type');
    const eventTimestamp = timestamp ?? this.now();
    if (!Number.isFinite(eventTimestamp)) {
      throw new Error('Profiler event timestamp must be a finite number.');
    }

    this.events.push({
      type,
      timestamp: eventTimestamp,
      sequence: this.nextEventSequence,
    });
    this.nextEventSequence += 1;

    if (this.events.length > MAX_EVENT_RETENTION) {
      this.events.splice(0, this.events.length - MAX_EVENT_RETENTION);
    }
  }

  getEventCount(): number {
    return this.events.length;
  }

  getEventTypeCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.events) {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    }
    return counts;
  }

  getRecentEvents(limit = 20): ProfilerEventRecord[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Profiler getRecentEvents limit must be a non-negative integer.');
    }
    return this.events.slice(-limit).map((event) => deepClone(event));
  }

  /**
   * Get event throughput over the specified trailing window.
   */
  getEventThroughput(windowMs = 1000): number {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error('Profiler event throughput windowMs must be a positive finite number.');
    }

    const now = this.now();
    const windowStart = now - windowMs;
    const recentCount = this.events.filter(
      (event) => event.timestamp >= windowStart && event.timestamp <= now,
    ).length;

    return (recentCount / windowMs) * 1000;
  }

  captureMemory(): ProfilerMemoryUsage {
    return deepClone(this.getMemoryUsageFn());
  }

  getTotalCpuTimeMs(): number {
    return this.totalCpuTimeMs;
  }

  reset(): void {
    this.sections.clear();
    this.operations.clear();
    this.events = [];
    this.nextEventSequence = 1;
    this.totalCpuTimeMs = 0;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('PerformanceProfiler name is required.');
    }

    for (const [id, section] of this.sections.entries()) {
      if (!id || id.trim() === '') {
        throw new Error('Profiler section id is required.');
      }
      if (!section.name || section.name.trim() === '') {
        throw new Error('Profiler section name is required.');
      }
      if (!['idle', 'running', 'stopped'].includes(section.state)) {
        throw new Error(`Invalid profiler section state "${section.state}".`);
      }
      if (
        section.startTime !== undefined &&
        section.endTime !== undefined &&
        section.startTime > section.endTime
      ) {
        throw new Error(`Profiler section "${id}" has invalid timing.`);
      }
    }

    for (const [name, operation] of this.operations.entries()) {
      if (!name || name.trim() === '') {
        throw new Error('Profiler operation name is required.');
      }
      if (operation.count < 1) {
        throw new Error(`Profiler operation "${name}" has invalid count.`);
      }
      if (operation.minMs > operation.maxMs || operation.minMs < 0) {
        throw new Error(`Profiler operation "${name}" has invalid min/max duration.`);
      }
    }
  }

  createSnapshot(): PerformanceProfileSnapshot {
    const sections = this.listSections();
    const operations = this.listOperations();
    const eventTypeCounts = this.getEventTypeCounts();
    const memory = this.captureMemory();

    return {
      name: this.name,
      timestamp: this.now(),
      cpuTimeMs: this.totalCpuTimeMs,
      sectionCount: this.sections.size,
      activeSectionCount: Array.from(this.sections.values())
        .filter((section) => section.state === 'running')
        .length,
      operationCount: this.operations.size,
      eventCount: this.events.length,
      eventTypeCounts,
      memory,
      sections,
      operations,
      recentEvents: this.getRecentEvents(20),
      summary: [
        this.name,
        `${this.totalCpuTimeMs.toFixed(2)}ms cpu`,
        `${this.sections.size} sections`,
        `${this.operations.size} operations`,
        `${this.events.length} events`,
        `heapUsed=${memory.heapUsed}`,
      ].join(' | '),
    };
  }

  private assertNonEmptyName(value: string, label: string): void {
    if (!value || value.trim() === '') {
      throw new Error(`${label} must be a non-empty string.`);
    }
  }
}
