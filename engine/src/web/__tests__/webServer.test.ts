import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebServer } from '../WebServer.js';
import { WebApplication } from '../WebApplication.js';

describe('WebServer', () => {
  let server: WebServer;
  let baseURL: string;

  beforeAll(async () => {
    server = new WebServer(new WebApplication());
    await server.start(0);
    baseURL = `http://localhost:${server.getPort()}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('serves the dashboard HTML', async () => {
    const response = await fetch(baseURL + '/');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('CYRE Web Release');
  });

  it('returns health', async () => {
    const response = await fetch(baseURL + '/api/health');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  it('lists missions', async () => {
    const response = await fetch(baseURL + '/api/missions');
    expect(response.status).toBe(200);
    const missions = await response.json();
    expect(Array.isArray(missions)).toBe(true);
    expect(missions).toContain('mission-001');
  });

  it('gets mission info', async () => {
    const response = await fetch(baseURL + '/api/missions/mission-001');
    expect(response.status).toBe(200);
    const info = await response.json();
    expect(info.id).toBe('mission-001');
    expect(info.name).toBe('The Compromised Employee');
  });

  it('starts a mission', async () => {
    const response = await fetch(baseURL + '/api/missions/mission-001/start', { method: 'POST' });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.missionId).toBe('mission-001');
  });

  it('gets mission state', async () => {
    const response = await fetch(baseURL + '/api/missions/mission-001/state');
    expect(response.status).toBe(200);
    const state = await response.json();
    expect(state.missionId).toBe('mission-001');
  });

  it('completes mission', async () => {
    const response = await fetch(baseURL + '/api/missions/mission-001/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accuracy: 1,
        responseTimeMs: 1000,
        damage: 0,
        evidenceQuality: 1,
        penalties: 0,
      }),
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.missionId).toBe('mission-001');
    expect(result.score).toBeDefined();
  });

  it('returns 404 for unknown mission', async () => {
    const response = await fetch(baseURL + '/api/missions/unknown');
    expect(response.status).toBe(404);
  });
});
