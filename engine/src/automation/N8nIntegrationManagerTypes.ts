import type { AutomationEvent } from './AutomationTypes.js';
import type { N8nIntegration } from './N8nIntegration.js';

export interface N8nIntegrationEntryDefinition {
  id: string;
  integration: N8nIntegration;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface N8nDeliveryResult {
  integrationId: string;
  allowed: boolean;
  statusCode: number | null;
  success: boolean;
  error?: string;
}

export interface N8nDeliveryReport {
  eventType: string;
  timestamp: number;
  integrationCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  results: N8nDeliveryResult[];
}

export interface N8nDeliveryRecord {
  sequence: number;
  event: AutomationEvent;
  dispatchedAt: number;
  report: N8nDeliveryReport;
}

export interface N8nIntegrationManagerStats {
  integrationCount: number;
  enabledIntegrationCount: number;
  deliveryCount: number;
  successCount: number;
  skippedCount: number;
  failureCount: number;
  historySize: number;
  historyLimit: number;
}

export interface N8nIntegrationManagerSnapshot {
  name: string;
  stats: N8nIntegrationManagerStats;
  integrationIds: string[];
  allowedTypesByIntegration: Record<string, string[]>;
  recentDeliveries: N8nDeliveryRecord[];
  summary: string;
}
