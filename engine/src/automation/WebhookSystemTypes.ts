import type { AutomationEvent } from './AutomationTypes.js';

export interface WebhookEndpointDefinition {
  id: string;
  url: string;
  allowedTypes?: string[];
  sources?: string[];
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  endpointId: string;
  statusCode: number;
  success: boolean;
  durationMs?: number;
  error?: string;
}

export interface WebhookDeliveryReport {
  eventType: string;
  timestamp: number;
  endpointCount: number;
  successCount: number;
  failureCount: number;
  results: WebhookDeliveryResult[];
}

export interface WebhookDeliveryRecord {
  sequence: number;
  event: AutomationEvent;
  dispatchedAt: number;
  report: WebhookDeliveryReport;
}

export interface WebhookSystemStats {
  endpointCount: number;
  enabledEndpointCount: number;
  deliveryCount: number;
  successCount: number;
  failureCount: number;
  historySize: number;
  historyLimit: number;
}

export interface WebhookSystemSnapshot {
  name: string;
  stats: WebhookSystemStats;
  endpointIds: string[];
  recentDeliveries: WebhookDeliveryRecord[];
  summary: string;
}

export type WebhookSender = (
  url: string,
  event: AutomationEvent,
) => Promise<number>;
