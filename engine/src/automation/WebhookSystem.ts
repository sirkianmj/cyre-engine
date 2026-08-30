import { EventBus, type BaseEvent } from '../core/index.js';
import type { AutomationEvent } from './AutomationTypes.js';
import { WebhookClient } from './WebhookClient.js';
import type {
  WebhookDeliveryReport,
  WebhookDeliveryRecord,
  WebhookDeliveryResult,
  WebhookEndpointDefinition,
  WebhookSender,
  WebhookSystemSnapshot,
  WebhookSystemStats,
} from './WebhookSystemTypes.js';

interface InternalWebhookEndpoint {
  id: string;
  url: string;
  allowedTypes: Set<string>;
  sources: Set<string>;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

interface WebhookSystemEvent extends BaseEvent {
  type: 'webhook:delivery' | 'webhook:delivery-error';
  endpointId?: string;
  eventType?: string;
  statusCode?: number;
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

function validateStringList(
  values: string[] | undefined,
  label: string,
): void {
  if (values === undefined) return;
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array.`);
  }
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${label} must contain non-empty strings.`);
    }
    if (seen.has(value)) {
      throw new Error(`${label} contains duplicate value "${value}".`);
    }
    seen.add(value);
  }
}

export class WebhookSystem {
  readonly name: string;
  private readonly endpoints = new Map<string, InternalWebhookEndpoint>();
  private readonly deliveries: WebhookDeliveryRecord[] = [];
  private readonly historyLimit: number;
  private readonly eventBus?: EventBus;
  private readonly sender: WebhookSender;
  private nextSequence = 1;
  private totalDeliveryCountValue = 0;
  private totalSuccessCountValue = 0;
  private totalFailureCountValue = 0;

  constructor(options: {
    name?: string;
    historyLimit?: number;
    eventBus?: EventBus;
    sender?: WebhookSender;
  } = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('WebhookSystem name cannot be empty if provided.');
    }
    if (
      options.historyLimit !== undefined &&
      (!Number.isInteger(options.historyLimit) || options.historyLimit < 1)
    ) {
      throw new Error('WebhookSystem historyLimit must be a positive integer.');
    }
    if (options.eventBus !== undefined && !(options.eventBus instanceof EventBus)) {
      throw new Error('WebhookSystem eventBus must be an EventBus instance if provided.');
    }
    if (options.sender !== undefined && typeof options.sender !== 'function') {
      throw new Error('WebhookSystem sender must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Webhook System';
    this.historyLimit = options.historyLimit ?? 1000;
    this.eventBus = options.eventBus;
    this.sender = options.sender ?? WebhookClient.send.bind(WebhookClient);
  }

  registerEndpoint(definition: WebhookEndpointDefinition): void {
    this.validateEndpointDefinition(definition);

    if (this.endpoints.has(definition.id)) {
      throw new Error(`Webhook endpoint "${definition.id}" is already registered.`);
    }

    let parsed: URL;
    try {
      parsed = new URL(definition.url);
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${definition.url}`);
    }

    const allowedTypes = new Set(definition.allowedTypes ?? []);
    const sources = new Set(definition.sources ?? []);

    this.endpoints.set(definition.id, {
      id: definition.id,
      url: parsed.toString(),
      allowedTypes,
      sources,
      enabled: definition.enabled ?? true,
      metadata: definition.metadata !== undefined
        ? deepClone(definition.metadata)
        : undefined,
    });
  }

  unregisterEndpoint(id: string): void {
    if (!this.endpoints.delete(id)) {
      throw new Error(`Webhook endpoint "${id}" does not exist.`);
    }
  }

  hasEndpoint(id: string): boolean {
    return this.endpoints.has(id);
  }

  getEndpoint(id: string): WebhookEndpointDefinition | undefined {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return undefined;

    return {
      id: endpoint.id,
      url: endpoint.url,
      allowedTypes: [...endpoint.allowedTypes],
      sources: [...endpoint.sources],
      enabled: endpoint.enabled,
      metadata: endpoint.metadata !== undefined
        ? deepClone(endpoint.metadata)
        : undefined,
    };
  }

  listEndpoints(): WebhookEndpointDefinition[] {
    return Array.from(this.endpoints.values()).map((endpoint) => ({
      id: endpoint.id,
      url: endpoint.url,
      allowedTypes: [...endpoint.allowedTypes],
      sources: [...endpoint.sources],
      enabled: endpoint.enabled,
      metadata: endpoint.metadata !== undefined
        ? deepClone(endpoint.metadata)
        : undefined,
    }));
  }

  listEndpointIds(): string[] {
    return Array.from(this.endpoints.keys()).sort();
  }

  setEndpointEnabled(id: string, enabled: boolean): void {
    const endpoint = this.requireEndpoint(id);
    if (typeof enabled !== 'boolean') {
      throw new Error('Webhook endpoint enabled must be a boolean.');
    }
    endpoint.enabled = enabled;
  }

  addAllowedType(id: string, type: string): void {
    assertNonEmpty(type, 'Webhook allowed type');
    const endpoint = this.requireEndpoint(id);
    endpoint.allowedTypes.add(type);
  }

  removeAllowedType(id: string, type: string): void {
    assertNonEmpty(type, 'Webhook allowed type');
    const endpoint = this.requireEndpoint(id);
    if (!endpoint.allowedTypes.delete(type)) {
      throw new Error(`Webhook endpoint "${id}" does not allow type "${type}".`);
    }
  }

  addSource(id: string, source: string): void {
    assertNonEmpty(source, 'Webhook source');
    const endpoint = this.requireEndpoint(id);
    endpoint.sources.add(source);
  }

  removeSource(id: string, source: string): void {
    assertNonEmpty(source, 'Webhook source');
    const endpoint = this.requireEndpoint(id);
    if (!endpoint.sources.delete(source)) {
      throw new Error(`Webhook endpoint "${id}" does not filter source "${source}".`);
    }
  }

  async dispatchEvent(event: AutomationEvent): Promise<WebhookDeliveryReport> {
    this.validateAutomationEvent(event);

    const eligibleEndpoints = Array.from(this.endpoints.values()).filter(
      (endpoint) => endpoint.enabled && this.isEndpointAllowed(endpoint, event),
    );

    const results: WebhookDeliveryResult[] = [];
    const startedAt = Date.now();

    for (const endpoint of eligibleEndpoints) {
      const endpointStartedAt = Date.now();
      try {
        const statusCode = await this.sender(endpoint.url, event);
        results.push({
          endpointId: endpoint.id,
          statusCode,
          success: statusCode >= 200 && statusCode < 300,
          durationMs: Date.now() - endpointStartedAt,
        });
        this.eventBus?.publish<WebhookSystemEvent>({
          type: 'webhook:delivery',
          timestamp: Date.now(),
          endpointId: endpoint.id,
          eventType: event.type,
          statusCode,
        });
      } catch (error) {
        results.push({
          endpointId: endpoint.id,
          statusCode: 0,
          success: false,
          durationMs: Date.now() - endpointStartedAt,
          error: (error as Error).message ?? 'Unknown webhook delivery error.',
        });
        this.eventBus?.publish<WebhookSystemEvent>({
          type: 'webhook:delivery-error',
          timestamp: Date.now(),
          endpointId: endpoint.id,
          eventType: event.type,
          statusCode: 0,
        });
      }
    }

    const successCount = results.filter((result) => result.success).length;
    const failureCount = results.length - successCount;
    const report: WebhookDeliveryReport = {
      eventType: event.type,
      timestamp: event.timestamp,
      endpointCount: results.length,
      successCount,
      failureCount,
      results,
    };

    this.totalSuccessCountValue += successCount;
    this.totalFailureCountValue += failureCount;

    const record: WebhookDeliveryRecord = {
      sequence: this.nextSequence,
      event: deepClone(event),
      dispatchedAt: startedAt,
      report: deepClone(report),
    };
    this.nextSequence += 1;
    this.totalDeliveryCountValue += 1;
    this.deliveries.push(record);
    this.trimHistory();

    return deepClone(report);
  }

  emitEvent(event: AutomationEvent): Promise<WebhookDeliveryReport> {
    return this.dispatchEvent(event);
  }

  getHistory(limit?: number): WebhookDeliveryRecord[] {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
      throw new Error('WebhookSystem history limit must be a non-negative integer.');
    }

    const history = this.deliveries.map((record) => deepClone(record));
    return limit !== undefined ? history.slice(-limit) : history;
  }

  getRecentDeliveries(limit = 20): WebhookDeliveryRecord[] {
    return this.getHistory(limit);
  }

  getStats(): WebhookSystemStats {
    const endpoints = Array.from(this.endpoints.values());
    const successCount = this.totalSuccessCountValue;
    const failureCount = this.totalFailureCountValue;

    return {
      endpointCount: this.endpoints.size,
      enabledEndpointCount: endpoints.filter((endpoint) => endpoint.enabled).length,
      deliveryCount: this.totalDeliveryCountValue,
      successCount,
      failureCount,
      historySize: this.deliveries.length,
      historyLimit: this.historyLimit,
    };
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('WebhookSystem name is required.');
    }
    if (!Number.isInteger(this.historyLimit) || this.historyLimit < 1) {
      throw new Error('WebhookSystem historyLimit must be a positive integer.');
    }
    for (const endpoint of this.endpoints.values()) {
      this.validateInternalEndpoint(endpoint);
    }
    for (const record of this.deliveries) {
      if (!record.event || !record.report || !Number.isInteger(record.sequence)) {
        throw new Error('WebhookSystem contains invalid delivery history.');
      }
    }
  }

  createSnapshot(): WebhookSystemSnapshot {
    const stats = this.getStats();
    const endpointIds = this.listEndpointIds();
    const recentDeliveries = this.getRecentDeliveries(20);

    return {
      name: this.name,
      stats,
      endpointIds,
      recentDeliveries,
      summary: [
        this.name,
        `${this.endpoints.size} endpoints`,
        `${stats.enabledEndpointCount} enabled`,
        `${this.deliveries.length} deliveries`,
        `success=${stats.successCount}`,
        `failure=${stats.failureCount}`,
      ].join(' | '),
    };
  }

  private isEndpointAllowed(
    endpoint: InternalWebhookEndpoint,
    event: AutomationEvent,
  ): boolean {
    if (
      endpoint.allowedTypes.size > 0 &&
      !endpoint.allowedTypes.has(event.type)
    ) {
      return false;
    }

    if (
      endpoint.sources.size > 0 &&
      (event.source === undefined || !endpoint.sources.has(event.source))
    ) {
      return false;
    }

    return true;
  }

  private validateEndpointDefinition(definition: WebhookEndpointDefinition): void {
    if (!isRecord(definition)) {
      throw new Error('Webhook endpoint definition must be an object.');
    }
    assertNonEmpty(definition.id, 'Webhook endpoint id');
    assertNonEmpty(definition.url, 'Webhook endpoint url');
    validateStringList(definition.allowedTypes, 'Webhook endpoint allowedTypes');
    validateStringList(definition.sources, 'Webhook endpoint sources');
    if (definition.enabled !== undefined && typeof definition.enabled !== 'boolean') {
      throw new Error('Webhook endpoint enabled must be a boolean.');
    }
    if (definition.metadata !== undefined && !isRecord(definition.metadata)) {
      throw new Error('Webhook endpoint metadata must be an object if provided.');
    }
  }

  private validateInternalEndpoint(endpoint: InternalWebhookEndpoint): void {
    if (!endpoint.id || !endpoint.url) {
      throw new Error('WebhookSystem contains an invalid endpoint.');
    }
  }

  private validateAutomationEvent(event: AutomationEvent): void {
    if (!isRecord(event)) {
      throw new Error('WebhookSystem event must be an object.');
    }
    assertNonEmpty(event.type, 'Webhook event type');
    if (!Number.isFinite(event.timestamp)) {
      throw new Error('Webhook event timestamp must be a finite number.');
    }
    if (event.source !== undefined && event.source.trim() === '') {
      throw new Error('Webhook event source cannot be empty if provided.');
    }
  }

  private requireEndpoint(id: string): InternalWebhookEndpoint {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      throw new Error(`Webhook endpoint "${id}" does not exist.`);
    }
    return endpoint;
  }

  private trimHistory(): void {
    if (this.deliveries.length > this.historyLimit) {
      this.deliveries.splice(0, this.deliveries.length - this.historyLimit);
    }
  }
}
