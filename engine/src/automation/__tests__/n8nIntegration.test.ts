import { describe, it, expect, vi } from 'vitest';
import {
  N8nIntegration,
  CYRE_EVENT_TYPES,
  isCyreEventType,
  type CyreEventType,
} from '../index.js';
import type { AutomationEvent } from '../AutomationTypes.js';
import { WebhookClient } from '../WebhookClient.js';

describe('cyreEventTypes', () => {
  it('defines expected event types', () => {
    expect(CYRE_EVENT_TYPES).toContain('incident_detected');
    expect(CYRE_EVENT_TYPES).toContain('player_decision_made');
  });

  it('isCyreEventType validates values', () => {
    expect(isCyreEventType('incident_detected')).toBe(true);
    expect(isCyreEventType('unknown_event')).toBe(false);
  });
});

describe('N8nIntegration', () => {
  const validUrl = 'https://n8n.example.com/webhook/cyre';

  it('creates instance with valid URL', () => {
    const integration = new N8nIntegration(validUrl);
    expect(integration.webhookUrl).toBe(validUrl);
  });

  it('throws on empty URL', () => {
    expect(() => new N8nIntegration('')).toThrow(/non-empty/);
  });

  it('throws on invalid URL', () => {
    expect(() => new N8nIntegration('not-a-url')).toThrow(/Invalid n8n webhook URL/);
  });

  it('filters events based on allowed types', () => {
    const integration = new N8nIntegration(validUrl, ['incident_detected']);
    expect(integration.isAllowed('incident_detected')).toBe(true);
    expect(integration.isAllowed('mission_completed')).toBe(false);
  });

  it('allows all types when no allowedTypes given', () => {
    const integration = new N8nIntegration(validUrl);
    expect(integration.isAllowed('anything')).toBe(true);
  });

  it('sends event via WebhookClient', async () => {
    const integration = new N8nIntegration(validUrl);
    const event: AutomationEvent = {
      type: 'incident_detected',
      timestamp: 1000,
      source: 'cyre',
    };
    const spy = vi.spyOn(WebhookClient, 'send').mockResolvedValue(200);
    const status = await integration.sendEvent(event);
    expect(status).toBe(200);
    expect(spy).toHaveBeenCalledWith(validUrl, event);
    spy.mockRestore();
  });

  it('does not send disallowed event', async () => {
    const integration = new N8nIntegration(validUrl, ['mission_completed']);
    const event: AutomationEvent = {
      type: 'incident_detected',
      timestamp: 1000,
    };
    const spy = vi.spyOn(WebhookClient, 'send').mockResolvedValue(200);
    const status = await integration.sendEvent(event);
    expect(status).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('builds workflow definition with nodes and connections', () => {
    const integration = new N8nIntegration(validUrl);
    const workflow = integration.buildWorkflowDefinition('Test Workflow');
    expect(workflow.name).toBe('Test Workflow');
    expect(workflow.nodes.length).toBeGreaterThan(0);
    expect(workflow.nodes[0].type).toContain('webhook');
    expect(workflow.connections).toHaveProperty('Webhook');
  });
});
