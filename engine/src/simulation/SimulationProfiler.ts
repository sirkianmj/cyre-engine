export type SimulationEventKind =
  | 'tick'
  | 'event'
  | 'state-transition'
  | 'entity'
  | 'schedule'
  | 'network-traversal'
  | 'attack'
  | 'evidence'
  | 'scenario'
  | 'ai';

export interface SimulationProfilerOptions {
  name?: string;
  now?: () => number;
}

export interface SimulationEventStats {
  kind: SimulationEventKind;
  name: string;
  count: number;
  totalDurationMs: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  lastDurationMs?: number;
  lastTimestamp?: number;
  lastMetadata?: Record<string, unknown>;
}

export interface SimulationEntityCounter {
  type: string;
  added: number;
  removed: number;
  current: number;
  peak: number;
}

export interface SimulationProfileSnapshot {
  name: string;
  timestamp: number;
  runCount: number;
  lastRunDurationMs?: number;
  tickCount: number;
  totalTickDurationMs: number;
  eventKindCounts: Record<string, number>;
  eventTypeCounts: Record<string, number>;
  operationCount: number;
  operations: SimulationEventStats[];
  entityCounters: SimulationEntityCounter[];
  queueDepthCurrent: number;
  queueDepthPeak: number;
  networkTraversals: {
    count: number;
    totalVisitedNodes: number;
    totalTraversedEdges: number;
  };
  attackStageCounts: Record<string, number>;
  evidenceTypeCounts: Record<string, number>;
  scenarioEvaluationCount: number;
  summary: string;
}

const VALID_KINDS: readonly SimulationEventKind[] = [
  'tick',
  'event',
  'state-transition',
  'entity',
  'schedule',
  'network-traversal',
  'attack',
  'evidence',
  'scenario',
  'ai',
];

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keyOf(kind: SimulationEventKind, name: string): string {
  return `${kind}:${name}`;
}

interface OperationState {
  kind: SimulationEventKind;
  name: string;
  count: number;
  totalDurationMs: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  lastDurationMs?: number;
  lastTimestamp?: number;
  lastMetadata?: Record<string, unknown>;
}

interface EntityCounterState {
  type: string;
  added: number;
  removed: number;
  current: number;
  peak: number;
}

export class SimulationProfiler {
  readonly name: string;
  private readonly nowFn: () => number;
  private readonly operations = new Map<string, OperationState>();
  private readonly entityCounters = new Map<string, EntityCounterState>();
  private readonly attackStageCounts: Record<string, number> = {};
  private readonly evidenceTypeCounts: Record<string, number> = {};
  private runCountValue = 0;
  private lastRunStart?: number;
  private lastRunDurationMs?: number;
  private tickCountValue = 0;
  private totalTickDurationMsValue = 0;
  private queueDepthCurrentValue = 0;
  private queueDepthPeakValue = 0;
  private networkTraversalCount = 0;
  private totalVisitedNodesValue = 0;
  private totalTraversedEdgesValue = 0;
  private scenarioEvaluationCountValue = 0;

  constructor(options: SimulationProfilerOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('SimulationProfiler name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('SimulationProfiler now must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Simulation Profiler';
    this.nowFn = options.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  beginRun(): void {
    this.lastRunStart = this.now();
  }

  endRun(): number {
    if (this.lastRunStart === undefined) {
      throw new Error('SimulationProfiler beginRun must be called before endRun.');
    }

    const endTime = this.now();
    const durationMs = endTime - this.lastRunStart;
    if (durationMs < 0) {
      throw new Error('SimulationProfiler run duration cannot be negative.');
    }

    this.runCountValue += 1;
    this.lastRunDurationMs = durationMs;
    this.lastRunStart = undefined;
    return durationMs;
  }

  recordEvent(
    kind: SimulationEventKind,
    name: string,
    durationMs?: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.validateKind(kind);
    this.assertNonEmptyName(name, 'Simulation event name');
    if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs < 0)) {
      throw new Error('Simulation event durationMs must be a non-negative finite number.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('Simulation event metadata must be an object if provided.');
    }

    const key = keyOf(kind, name);
    const timestamp = this.now();
    const current = this.operations.get(key);

    if (current === undefined) {
      this.operations.set(key, {
        kind,
        name,
        count: 1,
        totalDurationMs: durationMs ?? 0,
        minDurationMs: durationMs,
        maxDurationMs: durationMs,
        lastDurationMs: durationMs,
        lastTimestamp: timestamp,
        lastMetadata: metadata !== undefined ? deepClone(metadata) : undefined,
      });
    } else {
      current.count += 1;
      if (durationMs !== undefined) {
        current.totalDurationMs += durationMs;
        current.minDurationMs = current.minDurationMs === undefined
          ? durationMs
          : Math.min(current.minDurationMs, durationMs);
        current.maxDurationMs = current.maxDurationMs === undefined
          ? durationMs
          : Math.max(current.maxDurationMs, durationMs);
        current.lastDurationMs = durationMs;
      }
      current.lastTimestamp = timestamp;
      if (metadata !== undefined) {
        current.lastMetadata = deepClone(metadata);
      }
    }
  }

  recordTick(durationMs: number, metadata?: Record<string, unknown>): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('SimulationProfiler tick durationMs must be a non-negative finite number.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('SimulationProfiler tick metadata must be an object if provided.');
    }

    this.tickCountValue += 1;
    this.totalTickDurationMsValue += durationMs;
    this.recordEvent('tick', 'simulation-tick', durationMs, metadata);
  }

  recordEntityChange(type: string, delta: number, metadata?: Record<string, unknown>): void {
    this.assertNonEmptyName(type, 'Simulation entity type');
    if (!Number.isInteger(delta)) {
      throw new Error('Simulation entity delta must be an integer.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('Simulation entity metadata must be an object if provided.');
    }

    const current = this.entityCounters.get(type);
    if (current === undefined) {
      const initial = delta > 0 ? delta : 0;
      this.entityCounters.set(type, {
        type,
        added: delta > 0 ? delta : 0,
        removed: delta < 0 ? -delta : 0,
        current: delta,
        peak: initial,
      });
    } else {
      const next = current.current + delta;
      if (next < 0) {
        throw new Error(`Simulation entity count for type "${type}" cannot become negative.`);
      }

      current.current = next;
      current.peak = Math.max(current.peak, next);
      if (delta > 0) current.added += delta;
      if (delta < 0) current.removed += -delta;
    }

    this.recordEvent('entity', type, undefined, metadata);
  }

  recordQueueDepth(depth: number): void {
    if (!Number.isInteger(depth) || depth < 0) {
      throw new Error('Simulation queue depth must be a non-negative integer.');
    }

    this.queueDepthCurrentValue = depth;
    this.queueDepthPeakValue = Math.max(this.queueDepthPeakValue, depth);
    this.recordEvent('schedule', 'queue-depth', undefined, { depth });
  }

  recordNetworkTraversal(
    name: string,
    durationMs: number,
    visitedNodes: number,
    traversedEdges: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.assertNonEmptyName(name, 'Network traversal name');
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('Network traversal durationMs must be a non-negative finite number.');
    }
    if (!Number.isInteger(visitedNodes) || visitedNodes < 0) {
      throw new Error('Network traversal visitedNodes must be a non-negative integer.');
    }
    if (!Number.isInteger(traversedEdges) || traversedEdges < 0) {
      throw new Error('Network traversal traversedEdges must be a non-negative integer.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('Network traversal metadata must be an object if provided.');
    }

    this.networkTraversalCount += 1;
    this.totalVisitedNodesValue += visitedNodes;
    this.totalTraversedEdgesValue += traversedEdges;
    this.recordEvent('network-traversal', name, durationMs, {
      visitedNodes,
      traversedEdges,
      ...(metadata ?? {}),
    });
  }

  recordAttackStage(stage: string, durationMs: number, metadata?: Record<string, unknown>): void {
    this.assertNonEmptyName(stage, 'Attack stage');
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('Attack stage durationMs must be a non-negative finite number.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('Attack stage metadata must be an object if provided.');
    }

    this.attackStageCounts[stage] = (this.attackStageCounts[stage] ?? 0) + 1;
    this.recordEvent('attack', stage, durationMs, metadata);
  }

  recordEvidenceGeneration(
    evidenceType: string,
    durationMs: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.assertNonEmptyName(evidenceType, 'Evidence type');
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('Evidence generation durationMs must be a non-negative finite number.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('Evidence generation metadata must be an object if provided.');
    }

    this.evidenceTypeCounts[evidenceType] =
      (this.evidenceTypeCounts[evidenceType] ?? 0) + 1;
    this.recordEvent('evidence', evidenceType, durationMs, metadata);
  }

  recordScenarioEvaluation(name: string, durationMs: number, metadata?: Record<string, unknown>): void {
    this.assertNonEmptyName(name, 'Scenario evaluation name');
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('Scenario evaluation durationMs must be a non-negative finite number.');
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      throw new Error('Scenario evaluation metadata must be an object if provided.');
    }

    this.scenarioEvaluationCountValue += 1;
    this.recordEvent('scenario', name, durationMs, metadata);
  }

  listOperations(): SimulationEventStats[] {
    return Array.from(this.operations.values()).map((operation) => deepClone(operation));
  }

  listEntityCounters(): SimulationEntityCounter[] {
    return Array.from(this.entityCounters.values()).map((counter) => deepClone(counter));
  }

  getEntityCounter(type: string): SimulationEntityCounter | undefined {
    const counter = this.entityCounters.get(type);
    return counter !== undefined ? deepClone(counter) : undefined;
  }

  getAttackStageCounts(): Record<string, number> {
    return { ...this.attackStageCounts };
  }

  getEvidenceTypeCounts(): Record<string, number> {
    return { ...this.evidenceTypeCounts };
  }

  getQueueDepth(): { current: number; peak: number } {
    return {
      current: this.queueDepthCurrentValue,
      peak: this.queueDepthPeakValue,
    };
  }

  reset(): void {
    this.operations.clear();
    this.entityCounters.clear();
    for (const key of Object.keys(this.attackStageCounts)) {
      delete this.attackStageCounts[key];
    }
    for (const key of Object.keys(this.evidenceTypeCounts)) {
      delete this.evidenceTypeCounts[key];
    }
    this.runCountValue = 0;
    this.lastRunStart = undefined;
    this.lastRunDurationMs = undefined;
    this.tickCountValue = 0;
    this.totalTickDurationMsValue = 0;
    this.queueDepthCurrentValue = 0;
    this.queueDepthPeakValue = 0;
    this.networkTraversalCount = 0;
    this.totalVisitedNodesValue = 0;
    this.totalTraversedEdgesValue = 0;
    this.scenarioEvaluationCountValue = 0;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('SimulationProfiler name is required.');
    }
    if (!Number.isFinite(this.queueDepthCurrentValue) || this.queueDepthCurrentValue < 0) {
      throw new Error('SimulationProfiler queue depth current must be non-negative.');
    }
    if (!Number.isFinite(this.queueDepthPeakValue) || this.queueDepthPeakValue < 0) {
      throw new Error('SimulationProfiler queue depth peak must be non-negative.');
    }
    if (this.queueDepthPeakValue < this.queueDepthCurrentValue) {
      throw new Error('SimulationProfiler queue depth peak cannot be less than current.');
    }

    for (const operation of this.operations.values()) {
      if (!operation.name || operation.name.trim() === '') {
        throw new Error('SimulationProfiler operation name is required.');
      }
      if (operation.count < 1) {
        throw new Error('SimulationProfiler operation count must be positive.');
      }
      if (
        operation.minDurationMs !== undefined &&
        operation.maxDurationMs !== undefined &&
        operation.minDurationMs > operation.maxDurationMs
      ) {
        throw new Error('SimulationProfiler operation min duration exceeds max duration.');
      }
    }
  }

  createSnapshot(): SimulationProfileSnapshot {
    const operations = this.listOperations();
    const entityCounters = this.listEntityCounters();

    const eventKindCounts: Record<string, number> = {};
    const eventTypeCounts: Record<string, number> = {};

    for (const operation of operations) {
      eventKindCounts[operation.kind] = (eventKindCounts[operation.kind] ?? 0) + operation.count;
      eventTypeCounts[operation.name] = (eventTypeCounts[operation.name] ?? 0) + operation.count;
    }

    return {
      name: this.name,
      timestamp: this.now(),
      runCount: this.runCountValue,
      lastRunDurationMs: this.lastRunDurationMs,
      tickCount: this.tickCountValue,
      totalTickDurationMs: this.totalTickDurationMsValue,
      eventKindCounts,
      eventTypeCounts,
      operationCount: this.operations.size,
      operations,
      entityCounters,
      queueDepthCurrent: this.queueDepthCurrentValue,
      queueDepthPeak: this.queueDepthPeakValue,
      networkTraversals: {
        count: this.networkTraversalCount,
        totalVisitedNodes: this.totalVisitedNodesValue,
        totalTraversedEdges: this.totalTraversedEdgesValue,
      },
      attackStageCounts: this.getAttackStageCounts(),
      evidenceTypeCounts: this.getEvidenceTypeCounts(),
      scenarioEvaluationCount: this.scenarioEvaluationCountValue,
      summary: [
        this.name,
        `${this.tickCountValue} ticks`,
        `${this.runCountValue} runs`,
        `${this.operations.size} operations`,
        `queue=${this.queueDepthCurrentValue}/${this.queueDepthPeakValue}`,
        `networkTraversals=${this.networkTraversalCount}`,
      ].join(' | '),
    };
  }

  private validateKind(kind: SimulationEventKind): void {
    if (!VALID_KINDS.includes(kind)) {
      throw new Error(`Invalid simulation event kind "${kind}".`);
    }
  }

  private assertNonEmptyName(value: string, label: string): void {
    if (!value || value.trim() === '') {
      throw new Error(`${label} must be a non-empty string.`);
    }
  }
}
