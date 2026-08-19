import type { AutomationEvent } from './AutomationTypes.js';
import { N8nIntegration } from './N8nIntegration.js';
import type {
  N8nDeliveryReport,
  N8nDeliveryRecord,
  N8nDeliveryResult,
  N8nIntegrationEntryDefinition,
  N8nIntegrationManagerSnapshot,
  N8nIntegrationManagerStats,
} from './N8nIntegrationManagerTypes.js';
import type { CyreEventType } from './cyreEventTypes.js';
import { isCyreEventType } from './cyreEventTypes.js';

interface InternalIntegrationEntry {
  id: string;
  integration: N8nIntegration;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

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

export class N8nIntegrationManager {
  readonly name: string;
  private readonly integrations = new Map<string, InternalIntegrationEntry>();
  private readonly deliveries: N8nDeliveryRecord[] = [];
  private readonly historyLimit: number;
  private nextSequence = 1;
  private totalDeliveryCountValue = 0;
  private totalSuccessCountValue = 0;
  private totalSkippedCountValue = 0;
  private totalFailureCountValue = 0;

  constructor(options: { name?: string; historyLimit?: number } = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('N8nIntegrationManager name cannot be empty if provided.');
    }
    if (
      options.historyLimit !== undefined &&
      (!Number.isInteger(options.historyLimit) || options.historyLimit < 1)
    ) {
      throw new Error('N8nIntegrationManager historyLimit must be a positive integer.');
    }

    this.name = options.name ?? 'CYRE n8n Integration Manager';
    this.historyLimit = options.historyLimit ?? 1000;
  }

  register(definition: N8nIntegrationEntryDefinition): void {
    this.validateEntryDefinition(definition);

    if (this.integrations.has(definition.id)) {
      throw new Error(`n8n integration "${definition.id}" is already registered.`);
    }

    this.integrations.set(definition.id, {
      id: definition.id,
      integration: definition.integration,
      enabled: definition.enabled ?? true,
      metadata: definition.metadata !== undefined
        ? deepClone(definition.metadata)
        : undefined,
    });
  }

  unregister(id: string): void {
    if (!this.integrations.delete(id)) {
      throw new Error(`n8n integration "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.integrations.has(id);
  }

  get(id: string): N8nIntegration | undefined {
    return this.integrations.get(id)?.integration;
  }

  listIds(): string[] {
    return Array.from(this.integrations.keys()).sort();
  }

  listIntegrations(): N8nIntegrationEntryDefinition[] {
    return Array.from(this.integrations.values()).map((entry) => ({
      id: entry.id,
      integration: entry.integration,
      enabled: entry.enabled,
      metadata: entry.metadata !== undefined
        ? deepClone(entry.metadata)
        : undefined,
    }));
  }

  setEnabled(id: string, enabled: boolean): void {
    const entry = this.requireEntry(id);
    if (typeof enabled !== 'boolean') {
      throw new Error('n8n integration enabled must be a boolean.');
    }
    entry.enabled = enabled;
  }

  isEnabled(id: string): boolean {
    return this.requireEntry(id).enabled;
  }

  addAllowedType(id: string, type: CyreEventType): void {
    if (!isCyreEventType(type)) {
      throw new Error(`Invalid CYRE event type "${type}".`);
    }
    this.requireEntry(id).integration.allowEventType(type);
  }

  setAllowedTypes(id: string, types: CyreEventType[]): void {
    if (!Array.isArray(types)) {
      throw new Error('n8n allowed types must be an array.');
    }
    const entry = this.requireEntry(id);
    // N8nIntegration does not expose a setter, so we can only add.
    // For manager-level filtering, we'll rely on each integration's isAllowed.
    for (const type of types) {
      if (!isCyreEventType(type)) {
        throw new Error(`Invalid CYRE event type "${type}".`);
      }
      entry.integration.allowEventType(type);
    }
  }

  isAllowed(id: string, type: string): boolean {
    return this.requireEntry(id).integration.isAllowed(type);
  }

  buildWorkflowDefinition(id: string, workflowName?: string) {
    return this.requireEntry(id).integration.buildWorkflowDefinition(workflowName);
  }

  async sendEvent(event: AutomationEvent): Promise<N8nDeliveryReport> {
    this.validateAutomationEvent(event);

    const entries = Array.from(this.integrations.values());
    const results: N8nDeliveryResult[] = [];

    for (const entry of entries) {
      if (!entry.enabled) {
        results.push({
          integrationId: entry.id,
          allowed: false,
          statusCode: null,
          success: false,
        });
        continue;
      }

      try {
        const statusCode = await entry.integration.sendEvent(event);
        if (statusCode === null) {
          results.push({
            integrationId: entry.id,
            allowed: false,
            statusCode: null,
            success: false,
          });
        } else {
          results.push({
            integrationId: entry.id,
            allowed: true,
            statusCode,
            success: statusCode >= 200 && statusCode < 300,
          });
        }
      } catch (error) {
        results.push({
          integrationId: entry.id,
          allowed: true,
          statusCode: 0,
          success: false,
          error: (error as Error).message ?? 'Unknown n8n delivery error.',
        });
      }
    }

    const sentCount = results.filter(
      (result) => result.allowed && result.statusCode !== null,
    ).length;
    const successCount = results.filter((result) => result.success).length;
    const skippedCount = results.filter((result) => !result.allowed).length;
    const failedCount = results.filter(
      (result) => result.allowed && !result.success,
    ).length;

    const report: N8nDeliveryReport = {
      eventType: event.type,
      timestamp: event.timestamp,
      integrationCount: results.length,
      sentCount,
      skippedCount,
      failedCount,
      results,
    };

    this.totalDeliveryCountValue += 1;
    this.totalSuccessCountValue += successCount;
    this.totalSkippedCountValue += skippedCount;
    this.totalFailureCountValue += failedCount;

    const record: N8nDeliveryRecord = {
      sequence: this.nextSequence,
      event: deepClone(event),
      dispatchedAt: Date.now(),
      report: deepClone(report),
    };
    this.nextSequence += 1;
    this.deliveries.push(record);
    this.trimHistory();

    return deepClone(report);
  }

  emitEvent(event: AutomationEvent): Promise<N8nDeliveryReport> {
    return this.sendEvent(event);
  }

  getHistory(limit?: number): N8nDeliveryRecord[] {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
      throw new Error('n8n manager history limit must be a non-negative integer.');
    }

    const history = this.deliveries.map((record) => deepClone(record));
    return limit !== undefined ? history.slice(-limit) : history;
  }

  getRecentDeliveries(limit = 20): N8nDeliveryRecord[] {
    return this.getHistory(limit);
  }

  getStats(): N8nIntegrationManagerStats {
    const entries = Array.from(this.integrations.values());
    return {
      integrationCount: this.integrations.size,
      enabledIntegrationCount: entries.filter((entry) => entry.enabled).length,
      deliveryCount: this.totalDeliveryCountValue,
      successCount: this.totalSuccessCountValue,
      skippedCount: this.totalSkippedCountValue,
      failureCount: this.totalFailureCountValue,
      historySize: this.deliveries.length,
      historyLimit: this.historyLimit,
    };
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('N8nIntegrationManager name is required.');
    }
    if (!Number.isInteger(this.historyLimit) || this.historyLimit < 1) {
      throw new Error('N8nIntegrationManager historyLimit must be a positive integer.');
    }
    for (const entry of this.integrations.values()) {
      if (!entry.id || !(entry.integration instanceof N8nIntegration)) {
        throw new Error('N8nIntegrationManager contains an invalid integration entry.');
      }
    }
    for (const record of this.deliveries) {
      if (!record.event || !record.report || !Number.isInteger(record.sequence)) {
        throw new Error('N8nIntegrationManager contains an invalid delivery history.');
      }
    }
  }

  createSnapshot(): N8nIntegrationManagerSnapshot {
    const stats = this.getStats();
    const integrationIds = this.listIds();
    const allowedTypesByIntegration: Record<string, string[]> = {};

    for (const [id, entry] of this.integrations.entries()) {
      allowedTypesByIntegration[id] = Array.from(
        (entry.integration as unknown as {
          allowedTypes?: Set<CyreEventType>;
        }).allowedTypes ?? [],
      ).sort();
    }

    return {
      name: this.name,
      stats,
      integrationIds,
      allowedTypesByIntegration,
      recentDeliveries: this.getRecentDeliveries(20),
      summary: [
        this.name,
        `${this.integrations.size} integrations`,
        `${stats.enabledIntegrationCount} enabled`,
        `${this.deliveries.length} deliveries`,
        `success=${stats.successCount}`,
        `skipped=${stats.skippedCount}`,
        `failure=${stats.failureCount}`,
      ].join(' | '),
    };
  }

  private requireEntry(id: string): InternalIntegrationEntry {
    const entry = this.integrations.get(id);
    if (!entry) {
      throw new Error(`n8n integration "${id}" does not exist.`);
    }
    return entry;
  }

  private validateEntryDefinition(
    definition: N8nIntegrationEntryDefinition,
  ): void {
    if (!isRecord(definition)) {
      throw new Error('n8n integration entry definition must be an object.');
    }
    assertNonEmpty(definition.id, 'n8n integration id');
    if (!(definition.integration instanceof N8nIntegration)) {
      throw new Error('n8n integration entry must contain an N8nIntegration instance.');
    }
    if (definition.enabled !== undefined && typeof definition.enabled !== 'boolean') {
      throw new Error('n8n integration enabled must be a boolean.');
    }
    if (definition.metadata !== undefined && !isRecord(definition.metadata)) {
      throw new Error('n8n integration metadata must be an object if provided.');
    }
  }

  private validateAutomationEvent(event: AutomationEvent): void {
    if (!isRecord(event)) {
      throw new Error('n8n manager event must be an object.');
    }
    assertNonEmpty(event.type, 'n8n manager event type');
    if (!Number.isFinite(event.timestamp)) {
      throw new Error('n8n manager event timestamp must be a finite number.');
    }
    if (event.source !== undefined && event.source.trim() === '') {
      throw new Error('n8n manager event source cannot be empty if provided.');
    }
  }

  private trimHistory(): void {
    if (this.deliveries.length > this.historyLimit) {
      this.deliveries.splice(0, this.deliveries.length - this.historyLimit);
    }
  }
}
