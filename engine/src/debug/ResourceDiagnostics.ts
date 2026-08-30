import type { ProfilerMemoryUsage } from './PerformanceProfiler.js';

export type ResourceMetricKey = keyof ProfilerMemoryUsage;

export interface ResourceUsageSnapshot {
  name: string;
  current: number;
  peak: number;
  totalRecorded: number;
  updateCount: number;
  lastUpdatedAt?: number;
}

export interface ResourceSample {
  sequence: number;
  timestamp: number;
  memory: ProfilerMemoryUsage;
  customResources: Record<string, number>;
}

export interface ResourceDiagnosticsOptions {
  name?: string;
  now?: () => number;
  getMemoryUsage?: () => ProfilerMemoryUsage;
  maxSamples?: number;
}

export interface ResourceThresholdResult {
  metric: ResourceMetricKey;
  current: number;
  threshold: number;
  exceededBy: number;
}

export interface ResourceDiagnosticsSnapshot {
  name: string;
  timestamp: number;
  sampleCount: number;
  currentMemory: ProfilerMemoryUsage;
  peakMemory: ProfilerMemoryUsage;
  baselineMemory?: ProfilerMemoryUsage;
  customResources: ResourceUsageSnapshot[];
  memoryDeltaFromBaseline: Partial<Record<ResourceMetricKey, number>>;
  growthIssues: string[];
  summary: string;
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

interface CustomResourceState {
  name: string;
  current: number;
  peak: number;
  totalRecorded: number;
  updateCount: number;
  lastUpdatedAt?: number;
}

const MEMORY_METRIC_KEYS: readonly ResourceMetricKey[] = [
  'heapUsed',
  'heapTotal',
  'external',
  'arrayBuffers',
  'rss',
];

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }
}

export class ResourceDiagnostics {
  readonly name: string;
  private readonly nowFn: () => number;
  private readonly getMemoryUsageFn: () => ProfilerMemoryUsage;
  private readonly maxSamples: number;
  private readonly samples: ResourceSample[] = [];
  private readonly customResources = new Map<string, CustomResourceState>();
  private baselineMemory?: ProfilerMemoryUsage;
  private peakMemoryValue: ProfilerMemoryUsage = {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    arrayBuffers: 0,
    rss: 0,
  };
  private nextSequence = 1;

  constructor(options: ResourceDiagnosticsOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('ResourceDiagnostics name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('ResourceDiagnostics now must be a function if provided.');
    }
    if (options.getMemoryUsage !== undefined && typeof options.getMemoryUsage !== 'function') {
      throw new Error('ResourceDiagnostics getMemoryUsage must be a function if provided.');
    }
    if (
      options.maxSamples !== undefined &&
      (!Number.isInteger(options.maxSamples) || options.maxSamples < 1)
    ) {
      throw new Error('ResourceDiagnostics maxSamples must be a positive integer.');
    }

    this.name = options.name ?? 'CYRE Resource Diagnostics';
    this.nowFn = options.now ?? (() => Date.now());
    this.getMemoryUsageFn = options.getMemoryUsage ?? defaultMemoryUsage;
    this.maxSamples = options.maxSamples ?? 1000;
  }

  now(): number {
    return this.nowFn();
  }

  captureMemory(): ProfilerMemoryUsage {
    const memory = deepClone(this.getMemoryUsageFn());
    this.assertValidMemory(memory);
    return memory;
  }

  recordSample(customResources: Record<string, number> = {}): ResourceSample {
    if (!isRecord(customResources)) {
      throw new Error('Resource sample customResources must be an object.');
    }

    for (const [name, value] of Object.entries(customResources)) {
      assertFiniteNonNegative(value, `Custom resource "${name}"`);
    }

    const memory = this.captureMemory();
    this.recordPeakMemory(memory);

    const sample: ResourceSample = {
      sequence: this.nextSequence,
      timestamp: this.now(),
      memory,
      customResources: deepClone(customResources),
    };

    this.nextSequence += 1;
    this.samples.push(sample);

    if (this.samples.length > this.maxSamples) {
      this.samples.splice(0, this.samples.length - this.maxSamples);
    }

    this.recordBaselineIfNeeded();
    this.syncCustomResourcesFromSample(customResources);
    return deepClone(sample);
  }

  setResourceUsage(name: string, value: number): void {
    this.assertNonEmptyName(name, 'Resource name');
    assertFiniteNonNegative(value, `Resource "${name}" usage`);

    const current = this.customResources.get(name);
    const timestamp = this.now();

    if (current === undefined) {
      this.customResources.set(name, {
        name,
        current: value,
        peak: value,
        totalRecorded: value,
        updateCount: 1,
        lastUpdatedAt: timestamp,
      });
    } else {
      current.current = value;
      current.peak = Math.max(current.peak, value);
      current.totalRecorded += value;
      current.updateCount += 1;
      current.lastUpdatedAt = timestamp;
    }
  }

  getResourceUsage(name: string): ResourceUsageSnapshot | undefined {
    const resource = this.customResources.get(name);
    return resource !== undefined ? deepClone(resource) : undefined;
  }

  listResourceUsage(): ResourceUsageSnapshot[] {
    return Array.from(this.customResources.values()).map((resource) => deepClone(resource));
  }

  getResourceNames(): string[] {
    return Array.from(this.customResources.keys()).sort();
  }

  getSampleCount(): number {
    return this.samples.length;
  }

  getSamples(): ResourceSample[] {
    return this.samples.map((sample) => deepClone(sample));
  }

  getLatestSample(): ResourceSample | undefined {
    const sample = this.samples.at(-1);
    return sample !== undefined ? deepClone(sample) : undefined;
  }

  getPeakMemory(): ProfilerMemoryUsage {
    return deepClone(this.peakMemoryValue);
  }

  getBaselineMemory(): ProfilerMemoryUsage | undefined {
    return this.baselineMemory !== undefined ? deepClone(this.baselineMemory) : undefined;
  }

  evaluateThresholds(
    thresholds: Partial<ProfilerMemoryUsage> = {},
  ): ResourceThresholdResult[] {
    if (!isRecord(thresholds)) {
      throw new Error('ResourceDiagnostics thresholds must be an object.');
    }

    const current = this.captureMemory();
    const results: ResourceThresholdResult[] = [];

    for (const metric of MEMORY_METRIC_KEYS) {
      const threshold = thresholds[metric];
      if (threshold === undefined) continue;

      assertFiniteNonNegative(threshold, `Threshold for ${metric}`);

      const currentValue = current[metric];
      if (currentValue === undefined) continue;

      if (currentValue > threshold) {
        results.push({
          metric,
          current: currentValue,
          threshold,
          exceededBy: currentValue - threshold,
        });
      }
    }

    return results;
  }

  detectGrowthIssues(options: {
    windowSamples?: number;
    heapUsedGrowthThreshold?: number;
    externalGrowthThreshold?: number;
  } = {}): string[] {
    const windowSamples = options.windowSamples ?? 10;
    if (!Number.isInteger(windowSamples) || windowSamples < 2) {
      throw new Error('ResourceDiagnostics growth windowSamples must be an integer of at least 2.');
    }

    const heapThreshold = options.heapUsedGrowthThreshold ?? 10 * 1024;
    if (!Number.isFinite(heapThreshold) || heapThreshold < 0) {
      throw new Error('heapUsedGrowthThreshold must be a non-negative finite number.');
    }

    const externalThreshold = options.externalGrowthThreshold ?? 5 * 1024;
    if (!Number.isFinite(externalThreshold) || externalThreshold < 0) {
      throw new Error('externalGrowthThreshold must be a non-negative finite number.');
    }

    const issues: string[] = [];
    const relevant = this.samples.slice(-windowSamples);
    if (relevant.length < 2) return issues;

    const first = relevant[0].memory;
    const last = relevant.at(-1)!.memory;

    const heapUsedGrowth = (last.heapUsed ?? 0) - (first.heapUsed ?? 0);
    if (heapUsedGrowth > heapThreshold) {
      issues.push(
        `heapUsed grew by ${heapUsedGrowth} bytes over ${relevant.length} samples, exceeding threshold of ${heapThreshold}.`,
      );
    }

    const externalGrowth = (last.external ?? 0) - (first.external ?? 0);
    if (externalGrowth > externalThreshold) {
      issues.push(
        `external grew by ${externalGrowth} bytes over ${relevant.length} samples, exceeding threshold of ${externalThreshold}.`,
      );
    }

    return issues;
  }

  reset(): void {
    this.samples.length = 0;
    this.customResources.clear();
    this.baselineMemory = undefined;
    this.peakMemoryValue = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      rss: 0,
    };
    this.nextSequence = 1;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('ResourceDiagnostics name is required.');
    }

    for (const [index, sample] of this.samples.entries()) {
      this.assertValidMemory(sample.memory);
      if (!Number.isInteger(sample.sequence) || sample.sequence < 1) {
        throw new Error(`Resource sample at index ${index} has invalid sequence.`);
      }
      if (!Number.isFinite(sample.timestamp)) {
        throw new Error(`Resource sample at index ${index} has invalid timestamp.`);
      }
      if (!isRecord(sample.customResources)) {
        throw new Error(`Resource sample at index ${index} has invalid customResources.`);
      }
    }

    for (const resource of this.customResources.values()) {
      if (!resource.name || resource.name.trim() === '') {
        throw new Error('ResourceDiagnostics custom resource name is required.');
      }
      if (!Number.isFinite(resource.current) || resource.current < 0) {
        throw new Error(`Resource "${resource.name}" current must be non-negative.`);
      }
      if (resource.peak < resource.current) {
        throw new Error(`Resource "${resource.name}" peak cannot be less than current.`);
      }
    }
  }

  createSnapshot(): ResourceDiagnosticsSnapshot {
    const currentMemory = this.captureMemory();
    const peakMemory = this.getPeakMemory();

    const memoryDeltaFromBaseline: Partial<Record<ResourceMetricKey, number>> = {};
    if (this.baselineMemory !== undefined) {
      for (const metric of MEMORY_METRIC_KEYS) {
        const baselineValue = this.baselineMemory[metric];
        const currentValue = currentMemory[metric];
        if (baselineValue !== undefined && currentValue !== undefined) {
          memoryDeltaFromBaseline[metric] = currentValue - baselineValue;
        }
      }
    }

    const customResources = this.listResourceUsage();
    const growthIssues = this.detectGrowthIssues();

    return {
      name: this.name,
      timestamp: this.now(),
      sampleCount: this.samples.length,
      currentMemory,
      peakMemory,
      baselineMemory: this.baselineMemory !== undefined
        ? deepClone(this.baselineMemory)
        : undefined,
      customResources,
      memoryDeltaFromBaseline,
      growthIssues,
      summary: [
        this.name,
        `${this.samples.length} samples`,
        `heapUsed=${currentMemory.heapUsed}`,
        `heapTotal=${currentMemory.heapTotal}`,
        `${customResources.length} custom resources`,
        `${growthIssues.length} growth issues`,
      ].join(' | '),
    };
  }

  private syncCustomResourcesFromSample(customResources: Record<string, number>): void {
    for (const [name, value] of Object.entries(customResources)) {
      this.setResourceUsage(name, value);
    }
  }

  private recordBaselineIfNeeded(): void {
    if (this.baselineMemory === undefined && this.samples.length > 0) {
      this.baselineMemory = deepClone(this.samples[0].memory);
    }
  }

  private recordPeakMemory(memory: ProfilerMemoryUsage): void {
    for (const metric of MEMORY_METRIC_KEYS) {
      const value = memory[metric];
      if (value === undefined) continue;

      const currentPeak = this.peakMemoryValue[metric];
      if (currentPeak === undefined || value > currentPeak) {
        (this.peakMemoryValue as Record<ResourceMetricKey, number | undefined>)[metric] = value;
      }
    }
  }

  private assertValidMemory(memory: ProfilerMemoryUsage): void {
    if (!isRecord(memory)) {
      throw new Error('ResourceDiagnostics memory usage must be an object.');
    }

    const requiredKeys: readonly ResourceMetricKey[] = [
      'heapUsed',
      'heapTotal',
      'external',
      'arrayBuffers',
    ];

    for (const key of requiredKeys) {
      const value = memory[key];
      if (value === undefined || !Number.isFinite(value) || value < 0) {
        throw new Error(`ResourceDiagnostics memory.${key} must be a non-negative finite number.`);
      }
    }

    if (memory.rss !== undefined && (!Number.isFinite(memory.rss) || memory.rss < 0)) {
      throw new Error('ResourceDiagnostics memory.rss must be a non-negative finite number if provided.');
    }
  }

  private assertNonEmptyName(value: string, label: string): void {
    if (!value || value.trim() === '') {
      throw new Error(`${label} must be a non-empty string.`);
    }
  }
}
