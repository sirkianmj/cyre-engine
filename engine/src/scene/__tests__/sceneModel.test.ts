import { describe, it, expect } from 'vitest';
import { SceneModel } from '../SceneModel.js';

function createScene(): SceneModel {
  const scene = new SceneModel({ id: 'scene-soc', name: 'SOC Investigation Scene', components: [] });
  scene.addOrganization({ id: 'org-acme', name: 'Acme Healthcare', industry: 'Healthcare' });
  scene.addNetwork({
    id: 'net-main',
    name: 'Main Network',
    nodes: ['internet', 'vpn', 'employee-pc', 'database'],
    edges: [
      { source: 'internet', target: 'vpn' },
      { source: 'vpn', target: 'employee-pc' },
      { source: 'employee-pc', target: 'database' },
    ],
  });
  scene.addHost({ id: 'host-pc', hostId: 'employee-pc', displayName: 'Employee PC' });
  scene.addUser({ id: 'user-alice', userId: 'alice.johnson' });
  scene.addService({ id: 'svc-db', serviceId: 'database-service' });
  scene.addSecurityControl({ id: 'ctrl-firewall', controlId: 'firewall', enabled: true });
  scene.addEnvironment({ id: 'env-2d', type: '2d', settings: { theme: 'dark' } });
  scene.addMissionState({
    id: 'mission-state-1',
    missionId: 'mission-001',
    status: 'pending',
    objectives: ['obj-001', 'obj-002'],
  });
  return scene;
}

describe('SceneModel', () => {
  it('creates a scene with id and name', () => {
    const scene = new SceneModel({ id: 'scene-1', name: 'Test Scene', components: [] });
    expect(scene.getId()).toBe('scene-1');
    expect(scene.getName()).toBe('Test Scene');
  });

  it('throws when id or name is missing', () => {
    expect(() => new SceneModel({ id: '', name: 'Bad', components: [] })).toThrow(/Scene id is required/);
    expect(() => new SceneModel({ id: 'bad', name: '   ', components: [] })).toThrow(/Scene name is required/);
  });

  it('adds and lists components', () => {
    const scene = createScene();
    expect(scene.getComponents()).toHaveLength(8);
    expect(scene.getComponentsByType('host')).toHaveLength(1);
  });

  it('retrieves a component by id', () => {
    const scene = createScene();
    expect(scene.getComponent('host-pc').type).toBe('host');
  });

  it('rejects duplicate component ids', () => {
    const scene = createScene();
    expect(() =>
      scene.addComponent({ id: 'host-pc', type: 'host', name: 'Duplicate Host' }),
    ).toThrow(/already exists/);
  });

  it('removes a component', () => {
    const scene = createScene();
    scene.removeComponent('host-pc');
    expect(() => scene.getComponent('host-pc')).toThrow(/does not exist/);
    expect(scene.getComponents()).toHaveLength(7);
  });

  it('validates network data', () => {
    const scene = new SceneModel({ id: 'scene-net', name: 'Network Scene', components: [] });
    expect(() =>
      scene.addNetwork({ id: 'net-bad', name: 'Bad Network', nodes: [], edges: [{} as any] }),
    ).toThrow(/source and target are required/);
  });

  it('validates environment type', () => {
    const scene = new SceneModel({ id: 'scene-env', name: 'Environment Scene', components: [] });
    expect(() =>
      scene.addEnvironment({ id: 'env-bad', type: '4d' as any, settings: {} }),
    ).toThrow(/Invalid environment type/);
  });

  it('validates mission state', () => {
    const scene = new SceneModel({ id: 'scene-mission', name: 'Mission Scene', components: [] });
    expect(() =>
      scene.addMissionState({ id: 'mission-bad', status: 'invalid' as any, objectives: [] }),
    ).toThrow(/Invalid mission state status/);
  });

  it('returns deep-copied component data', () => {
    const scene = createScene();
    const components = scene.getComponents();
    components[0].data = { changed: true };
    expect(scene.getComponent('org-acme').data).not.toEqual({ changed: true });
  });

  it('serializes to JSON with deep copy', () => {
    const scene = createScene();
    const json = scene.toJSON();
    json.components[0].name = 'Modified';
    expect(scene.getComponent('org-acme').name).toBe('Acme Healthcare');
  });
});
