import { describe, it, expect, vi } from 'vitest';
import {
  N8nIntegration,
  N8nIntegrationManager,
  WebhookClient,
  type AutomationEvent,
} from '../index.js';

const URL_A = 'https://n8n.example.com/webhook/a';
const URL_B = 'https://n8n.example.com/webhook/b';

describe('N8nIntegrationManager', () => {
  it('registers integrations and lists them', () => {
    const manager = new N8nIntegrationManager();
    const integrationA = new N8nIntegration(URL_A, ['incident_detected']);
    const integrationB = new N8nIntegration(URL_B);

    manager.register({ id: 'a', integration: integrationA });
    manager.register({ id: 'b', integration: integrationB, enabled: false });

    expect(manager.has('a')).toBe(true);
    expect(manager.listIds()).toEqual(['a', 'b']);
    expect(manager.get('a')).toBe(integrationA);
    expect(manager.isEnabled('a')).toBe(true);
    expect(manager.isEnabled('b')).toBe(false);
  });

  it('dispatches events to enabled integrations and respects allowlists', async () => {
    const sendSpy = vi.spyOn(WebhookClient, 'send').mockResolvedValue(200);
    const manager = new N8nIntegrationManager();
    manager.register({
      id: 'incident-only',
      integration: new N8nIntegration(URL_A, ['incident_detected']),
    });
    manager.register({
      id: 'all',
      integration: new N8nIntegration(URL_B),
    });

    const report = await manager.sendEvent({
      type: 'incident_detected',
      timestamp: 1000,
      source: 'siem',
    });

    expect(report.integrationCount).toBe(2);
    expect(report.sentCount).toBe(2);
    expect(report.skippedCount).toBe(0);
    expect(report.failedCount).toBe(0);
    expect(sendSpy).toHaveBeenCalledTimes(2);
    sendSpy.mockRestore();
  });

  it('skips disallowed event types', async () => {
    const sendSpy = vi.spyOn(WebhookClient, 'send').mockResolvedValue(200);
    const manager = new N8nIntegrationManager();
    manager.register({
      id: 'incident-only',
      integration: new N8nIntegration(URL_A, ['incident_detected']),
    });

    const report = await manager.sendEvent({
      type: 'mission_completed',
      timestamp: 2000,
    });

    expect(report.sentCount).toBe(0);
    expect(report.skippedCount).toBe(1);
    expect(sendSpy).not.toHaveBeenCalled();
    sendSpy.mockRestore();
  });

  it('handles disabled integrations', async () => {
    const sendSpy = vi.spyOn(WebhookClient, 'send').mockResolvedValue(200);
    const manager = new N8nIntegrationManager();
    manager.register({
      id: 'disabled',
      integration: new N8nIntegration(URL_A),
      enabled: false,
    });

    const report = await manager.sendEvent({
      type: 'incident_detected',
      timestamp: 1000,
    });

    expect(report.sentCount).toBe(0);
    expect(report.skippedCount).toBe(1);
    expect(sendSpy).not.toHaveBeenCalled();
    sendSpy.mockRestore();
  });

  it('handles delivery errors', async () => {
    vi.spyOn(WebhookClient, 'send').mockRejectedValue(new Error('network down'));
    const manager = new N8nIntegrationManager();
    manager.register({
      id: 'broken',
      integration: new N8nIntegration(URL_A),
    });

    const report = await manager.sendEvent({
      type: 'incident_detected',
      timestamp: 1000,
    });

    expect(report.failedCount).toBe(1);
    expect(report.results[0].error).toBe('network down');
    expect(report.results[0].statusCode).toBe(0);
    vi.restoreAllMocks();
  });

  it('manages allowed types and builds workflows', () => {
    const manager = new N8nIntegrationManager();
    const integration = new N8nIntegration(URL_A);
    manager.register({ id: 'a', integration });

    manager.addAllowedType('a', 'incident_detected');
    manager.setAllowedTypes('a', ['host_compromised', 'mission_completed']);

    expect(manager.isAllowed('a', 'incident_detected')).toBe(true);
    expect(manager.isAllowed('a', 'host_compromised')).toBe(true);
    expect(manager.isAllowed('a', 'mission_completed')).toBe(true);

    const workflow = manager.buildWorkflowDefinition('a', 'Custom Workflow');
    expect(workflow.name).toBe('Custom Workflow');
    expect(workflow.nodes[0].type).toContain('webhook');
  });

  it('rejects duplicate registrations and missing operations', () => {
    const manager = new N8nIntegrationManager();
    manager.register({ id: 'a', integration: new N8nIntegration(URL_A) });

    expect(() =>
      manager.register({ id: 'a', integration: new N8nIntegration(URL_B) }),
    ).toThrow(/already registered/);
    expect(() => manager.unregister('missing')).toThrow(/does not exist/);
    expect(() => manager.setEnabled('missing', true)).toThrow(/does not exist/);
    expect(() => manager.setAllowedTypes('missing', ['incident_detected'])).toThrow(/does not exist/);
    expect(() => manager.addAllowedType('a', 'invalid' as any)).toThrow(/event type/);
  });

  it('creates snapshots and validates cleanly', async () => {
    const sendSpy = vi.spyOn(WebhookClient, 'send').mockResolvedValue(200);
    const manager = new N8nIntegrationManager({
      name: 'Test n8n Manager',
      historyLimit: 2,
    });
    manager.register({
      id: 'a',
      integration: new N8nIntegration(URL_A, ['incident_detected']),
    });

    await manager.sendEvent({ type: 'incident_detected', timestamp: 1 });
    await manager.sendEvent({ type: 'mission_completed', timestamp: 2 });
    await manager.sendEvent({ type: 'incident_detected', timestamp: 3 });

    const snapshot = manager.createSnapshot();
    expect(snapshot.name).toBe('Test n8n Manager');
    expect(snapshot.stats.integrationCount).toBe(1);
    expect(snapshot.stats.deliveryCount).toBe(3);
    expect(snapshot.stats.skippedCount).toBe(1);
    expect(snapshot.stats.historySize).toBe(2);
    expect(snapshot.recentDeliveries).toHaveLength(2);
    expect(snapshot.recentDeliveries[0].event.type).toBe('mission_completed');
    expect(snapshot.summary).toContain('Test n8n Manager');
    expect(() => manager.validate()).not.toThrow();
    sendSpy.mockRestore();
  });
});
