import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AutomationServer } from '../AutomationServer.js';
import type { AutomationEvent } from '../AutomationTypes.js';

describe('AutomationServer', () => {
  let server: AutomationServer;
  let baseURL: string;

  beforeAll(async () => {
    server = new AutomationServer();
    await server.start(0); // ephemeral port
    const port = server.getPort();
    baseURL = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('responds to health check', async () => {
    const response = await fetch(`${baseURL}/health`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  it('accepts POST /events and retrieves via GET /events', async () => {
    const event: AutomationEvent = {
      type: 'test-event',
      timestamp: Date.now(),
      source: 'test',
      data: { foo: 'bar' },
    };

    const postResponse = await fetch(`${baseURL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    expect(postResponse.status).toBe(201);

    const getResponse = await fetch(`${baseURL}/events`);
    expect(getResponse.status).toBe(200);
    const events = (await getResponse.json()) as AutomationEvent[];
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('test-event');
  });

  it('returns 400 for invalid event JSON', async () => {
    const response = await fetch(`${baseURL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 for missing event type', async () => {
    const response = await fetch(`${baseURL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now() }),
    });
    expect(response.status).toBe(400);
  });

  it('registers and removes webhook URL', async () => {
    const registerResponse = await fetch(`${baseURL}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://localhost:9999/hook' }),
    });
    expect(registerResponse.status).toBe(201);

    const removeResponse = await fetch(`${baseURL}/webhook`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://localhost:9999/hook' }),
    });
    expect(removeResponse.status).toBe(200);
  });

  it('returns 404 for unknown route', async () => {
    const response = await fetch(`${baseURL}/unknown`);
    expect(response.status).toBe(404);
  });
});

describe('WebhookRegistry', () => {
  it('adds and removes webhooks', async () => {
    const { WebhookRegistry } = await import('../WebhookRegistry.js');
    const registry = new WebhookRegistry();
    registry.add('http://localhost:1234/test');
    expect(registry.getUrls()).toHaveLength(1);
    registry.remove('http://localhost:1234/test');
    expect(registry.getUrls()).toHaveLength(0);
  });

  it('throws on duplicate add', async () => {
    const { WebhookRegistry } = await import('../WebhookRegistry.js');
    const registry = new WebhookRegistry();
    registry.add('http://localhost:1234/test');
    expect(() => registry.add('http://localhost:1234/test')).toThrow(/already registered/);
  });
});
