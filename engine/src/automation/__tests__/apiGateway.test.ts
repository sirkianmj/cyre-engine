import { describe, it, expect } from 'vitest';
import {
  ApiGateway,
  type ApiResponse,
} from '../index.js';
import { EventBus } from '../../core/index.js';

function json(status: number, body: unknown): ApiResponse {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body,
  };
}

function createGateway(eventBus = new EventBus()): ApiGateway {
  const gateway = new ApiGateway({ eventBus });

  gateway.registerRoute({
    method: 'GET',
    path: '/health',
    handler: () => json(200, { status: 'ok' }),
  });

  gateway.registerRoute({
    method: 'GET',
    path: '/missions/:id',
    handler: (request) => json(200, { missionId: request.params!.id }),
  });

  gateway.registerRoute({
    method: 'POST',
    path: '/events',
    handler: (request) => json(201, { received: request.body }),
  });

  gateway.registerRoute({
    method: 'GET',
    path: '/fails',
    handler: () => {
      throw new Error('handler exploded');
    },
  });

  return gateway;
}

describe('ApiGateway', () => {
  it('registers and lists routes', () => {
    const gateway = createGateway();
    expect(gateway.hasRoute('GET', '/health')).toBe(true);
    expect(gateway.hasRoute('GET', '/missions/:id')).toBe(true);
    expect(gateway.listRoutes()).toHaveLength(4);
    expect(gateway.listRoutes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/missions/:id', paramNames: ['id'] }),
      ]),
    );
  });

  it('dispatches a static route', async () => {
    const gateway = createGateway();
    const response = await gateway.dispatch({ method: 'GET', path: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('extracts path parameters', async () => {
    const gateway = createGateway();
    const response = await gateway.dispatch({
      method: 'GET',
      path: '/missions/mission-001',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ missionId: 'mission-001' });
  });

  it('passes query, headers, and body to handlers', async () => {
    const gateway = createGateway();
    const response = await gateway.dispatch({
      method: 'POST',
      path: '/events',
      query: { source: 'test' },
      headers: { authorization: 'Bearer x' },
      body: { type: 'incident_detected' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ received: { type: 'incident_detected' } });
  });

  it('returns 404 for missing routes', async () => {
    const gateway = createGateway();
    const response = await gateway.dispatch({ method: 'GET', path: '/missing' });
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({ error: expect.stringContaining('No route found') });
  });

  it('returns 405 for method mismatch on existing path', async () => {
    const gateway = createGateway();
    const response = await gateway.dispatch({ method: 'DELETE', path: '/missions/1' });
    expect(response.statusCode).toBe(405);
    expect(response.body).toMatchObject({ error: expect.stringContaining('not allowed') });
  });

  it('converts handler errors to 500 responses', async () => {
    const gateway = createGateway();
    const response = await gateway.dispatch({ method: 'GET', path: '/fails' });
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: 'handler exploded' });
  });

  it('publishes events for handled, missing, and error requests', async () => {
    const bus = new EventBus();
    const gateway = createGateway(bus);
    await gateway.dispatch({ method: 'GET', path: '/health' });
    await gateway.dispatch({ method: 'GET', path: '/missing' });
    await gateway.dispatch({ method: 'GET', path: '/fails' });

    const history = bus.getHistory();
    expect(history.some((event) => event.type === 'api:request-handled')).toBe(true);
    expect(history.some((event) => event.type === 'api:route-not-found')).toBe(true);
    expect(history.some((event) => event.type === 'api:request-error')).toBe(true);
  });

  it('rejects duplicate routes', () => {
    const gateway = new ApiGateway();
    gateway.registerRoute({ method: 'GET', path: '/test', handler: () => json(200, {}) });
    expect(() =>
      gateway.registerRoute({ method: 'GET', path: '/test', handler: () => json(200, {}) }),
    ).toThrow(/already registered/);
  });

  it('rejects invalid route definitions', () => {
    const gateway = new ApiGateway();
    expect(() =>
      gateway.registerRoute({ method: 'INVALID' as any, path: '/x', handler: () => json(200, {}) }),
    ).toThrow(/method/);
    expect(() =>
      gateway.registerRoute({ method: 'GET', path: 'bad', handler: () => json(200, {}) }),
    ).toThrow(/start with "\/"/);
    expect(() =>
      gateway.registerRoute({ method: 'GET', path: '/x/:bad param', handler: () => json(200, {}) }),
    ).toThrow(/parameter/);
    expect(() =>
      gateway.registerRoute({ method: 'GET', path: '/x', handler: 'bad' as any }),
    ).toThrow(/handler/);
  });

  it('unregisters routes', () => {
    const gateway = createGateway();
    gateway.unregisterRoute('GET', '/health');
    expect(gateway.hasRoute('GET', '/health')).toBe(false);
    expect(() => gateway.unregisterRoute('GET', '/health')).toThrow(/does not exist/);
  });

  it('creates a snapshot and validates cleanly', async () => {
    const gateway = createGateway();
    await gateway.dispatch({ method: 'GET', path: '/health' });
    await gateway.dispatch({ method: 'GET', path: '/missions/1' });

    const snapshot = gateway.createSnapshot();
    expect(snapshot.name).toBe('CYRE API Gateway');
    expect(snapshot.routeCount).toBe(4);
    expect(snapshot.eventCount).toBe(2);
    expect(snapshot.routes).toHaveLength(4);
    expect(snapshot.summary).toContain('CYRE API Gateway');
    expect(() => gateway.validate()).not.toThrow();
  });
});
