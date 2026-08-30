import { describe, it, expect, vi } from 'vitest';
import {
  WebhookSystem,
  type AutomationEvent,
  type WebhookSender,
} from '../index.js';
import { EventBus } from '../../core/index.js';

function createSender() {
  const fn = vi.fn(async (_url: string, _event: AutomationEvent) => 200);
  return fn as unknown as WebhookSender & ReturnType<typeof vi.fn>;
}

describe('WebhookSystem', () => {
  it('registers endpoints and lists them', () => {
    const system = new WebhookSystem();
    system.registerEndpoint({
      id: 'slack',
      url: 'https://hooks.example.com/slack',
      allowedTypes: ['incident_detected'],
    });
    system.registerEndpoint({
      id: 'teams',
      url: 'https://hooks.example.com/teams',
      enabled: false,
    });

    expect(system.hasEndpoint('slack')).toBe(true);
    expect(system.listEndpointIds()).toEqual(['slack', 'teams']);
    expect(system.listEndpoints()).toHaveLength(2);
  });

  it('dispatches to matching enabled endpoints only', async () => {
    const sender = createSender();
    const system = new WebhookSystem({ sender });
    system.registerEndpoint({
      id: 'incident-webhook',
      url: 'https://example.com/incident',
      allowedTypes: ['incident_detected'],
    });
    system.registerEndpoint({
      id: 'all-webhook',
      url: 'https://example.com/all',
    });
    system.registerEndpoint({
      id: 'disabled-webhook',
      url: 'https://example.com/disabled',
      enabled: false,
    });

    const report = await system.dispatchEvent({
      type: 'incident_detected',
      timestamp: 1000,
      source: 'siem',
    });

    expect(report.endpointCount).toBe(2);
    expect(report.successCount).toBe(2);
    expect(report.failureCount).toBe(0);
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it('filters by source', async () => {
    const sender = createSender();
    const system = new WebhookSystem({ sender });
    system.registerEndpoint({
      id: 'vpn-only',
      url: 'https://example.com/vpn',
      sources: ['vpn'],
    });

    system.registerEndpoint({
      id: 'all-sources',
      url: 'https://example.com/all',
    });

    const report = await system.dispatchEvent({
      type: 'auth',
      timestamp: 1000,
      source: 'siem',
    });

    expect(report.endpointCount).toBe(1);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0]).toBe('https://example.com/all');
  });

  it('records failed deliveries', async () => {
    const sender = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as WebhookSender;
    const system = new WebhookSystem({ sender });
    system.registerEndpoint({
      id: 'broken',
      url: 'https://example.com/broken',
    });

    const report = await system.dispatchEvent({
      type: 'test',
      timestamp: 1,
    });

    expect(report.endpointCount).toBe(1);
    expect(report.successCount).toBe(0);
    expect(report.failureCount).toBe(1);
    expect(report.results[0].error).toBe('network down');
    expect(report.results[0].statusCode).toBe(0);
  });

  it('supports enable/disable and type/source management', () => {
    const system = new WebhookSystem();
    system.registerEndpoint({
      id: 'ep',
      url: 'https://example.com/ep',
    });

    system.addAllowedType('ep', 'incident_detected');
    system.addSource('ep', 'vpn');
    expect(system.getEndpoint('ep')).toMatchObject({
      allowedTypes: ['incident_detected'],
      sources: ['vpn'],
      enabled: true,
    });

    system.setEndpointEnabled('ep', false);
    expect(system.getEndpoint('ep')!.enabled).toBe(false);

    system.removeAllowedType('ep', 'incident_detected');
    system.removeSource('ep', 'vpn');
    expect(system.getEndpoint('ep')).toMatchObject({
      allowedTypes: [],
      sources: [],
    });
  });

  it('rejects duplicate endpoints and missing operations', () => {
    const system = new WebhookSystem();
    system.registerEndpoint({ id: 'a', url: 'https://example.com/a' });

    expect(() =>
      system.registerEndpoint({ id: 'a', url: 'https://example.com/a' }),
    ).toThrow(/already registered/);
    expect(() => system.unregisterEndpoint('missing')).toThrow(/does not exist/);
    expect(() => system.setEndpointEnabled('missing', true)).toThrow(/does not exist/);
    expect(() => system.addAllowedType('missing', 'x')).toThrow(/does not exist/);
    expect(() => system.removeSource('missing', 'x')).toThrow(/does not exist/);
  });

  it('publishes webhook events to EventBus', async () => {
    const bus = new EventBus();
    const sender = createSender();
    const system = new WebhookSystem({ sender, eventBus: bus });
    system.registerEndpoint({ id: 'ep', url: 'https://example.com/ep' });

    await system.dispatchEvent({ type: 'incident', timestamp: 1 });
    const history = bus.getHistory();
    expect(history.some((event) => event.type === 'webhook:delivery')).toBe(true);
  });

  it('creates snapshots and validates cleanly', async () => {
    const sender = createSender();
    const system = new WebhookSystem({
      name: 'Test Webhook System',
      historyLimit: 2,
      sender,
    });
    system.registerEndpoint({ id: 'ep', url: 'https://example.com/ep' });

    await system.dispatchEvent({ type: 'a', timestamp: 1 });
    await system.dispatchEvent({ type: 'b', timestamp: 2 });
    await system.dispatchEvent({ type: 'c', timestamp: 3 });

    const snapshot = system.createSnapshot();
    expect(snapshot.name).toBe('Test Webhook System');
    expect(snapshot.stats.endpointCount).toBe(1);
    expect(snapshot.stats.deliveryCount).toBe(3);
    expect(snapshot.stats.successCount).toBe(3);
    expect(snapshot.stats.historySize).toBe(2);
    expect(snapshot.recentDeliveries).toHaveLength(2);
    expect(snapshot.recentDeliveries[0].event.type).toBe('b');
    expect(snapshot.summary).toContain('Test Webhook System');
    expect(() => system.validate()).not.toThrow();
  });
});
