import { describe, it, expect } from 'vitest';
import { CyberWorldVisualization } from '../CyberWorldVisualization.js';
import {
  CYBER_ENVIRONMENT_TYPES,
  CYBER_ENTITY_VISUAL_TYPES,
  isCyberEnvironmentType,
  isCyberEntityVisualType,
} from '../CyberWorldTypes.js';
import { Renderer3D } from '../Renderer3D.js';
import { RenderTarget } from '../RenderTarget.js';

describe('CyberWorldTypes', () => {
  it('validates environment types', () => {
    expect(isCyberEnvironmentType('soc')).toBe(true);
    expect(isCyberEnvironmentType('not-env')).toBe(false);
  });

  it('validates entity visual types', () => {
    expect(isCyberEntityVisualType('server-rack')).toBe(true);
    expect(isCyberEntityVisualType('not-type')).toBe(false);
  });

  it('exposes expected type counts', () => {
    expect(CYBER_ENVIRONMENT_TYPES).toHaveLength(5);
    expect(CYBER_ENTITY_VISUAL_TYPES.length).toBeGreaterThan(10);
  });
});

describe('CyberWorldVisualization', () => {
  it('creates a valid visualization definition', () => {
    const viz = new CyberWorldVisualization({
      id: 'soc-1',
      name: 'Main SOC',
      environmentType: 'soc',
    });
    expect(viz.id).toBe('soc-1');
    expect(viz.environmentType).toBe('soc');
    expect(viz.getEntities()).toHaveLength(0);
  });

  it('rejects empty id, name, and invalid environment type', () => {
    expect(
      () => new CyberWorldVisualization({ id: '', name: 'x', environmentType: 'soc' }),
    ).toThrow(/id/);
    expect(
      () => new CyberWorldVisualization({ id: 'x', name: '', environmentType: 'soc' }),
    ).toThrow(/name/);
    expect(
      () => new CyberWorldVisualization({ id: 'x', name: 'x', environmentType: 'invalid' as any }),
    ).toThrow(/environmentType/);
  });

  it('adds entities and returns deep copies', () => {
    const viz = new CyberWorldVisualization({
      id: 'soc-2',
      name: 'SOC',
      environmentType: 'soc',
    });
    viz.addEntity({
      id: 'workstation-1',
      name: 'Analyst Workstation',
      type: 'workstation',
      position: { x: 0, y: 0, z: 0 },
      metadata: { nested: { value: 1 } },
    });

    const entity = viz.getEntity('workstation-1')!;
    entity.position!.x = 99;
    entity.metadata!.nested!.value = 99;

    expect(viz.getEntity('workstation-1')!.position!.x).toBe(0);
    expect(viz.getEntity('workstation-1')!.metadata!.nested!.value).toBe(1);
  });

  it('rejects duplicate entity ids', () => {
    const viz = new CyberWorldVisualization({
      id: 'soc-3',
      name: 'SOC',
      environmentType: 'soc',
      entities: [
        { id: 'entity-1', name: 'One', type: 'workstation' },
      ],
    });
    expect(
      () => viz.addEntity({ id: 'entity-1', name: 'Dup', type: 'server' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid entity data', () => {
    const viz = new CyberWorldVisualization({
      id: 'soc-4',
      name: 'SOC',
      environmentType: 'soc',
    });
    expect(
      () => viz.addEntity({ id: '', name: 'Bad', type: 'workstation' }),
    ).toThrow(/id/);
    expect(
      () => viz.addEntity({ id: 'bad', name: 'Bad', type: 'not-type' as any }),
    ).toThrow(/type/);
    expect(
      () => viz.addEntity({ id: 'bad', name: 'Bad', type: 'workstation', scale: { x: 0, y: 1, z: 1 } }),
    ).toThrow(/scale/);
  });

  it('round-trips through JSON', () => {
    const viz = CyberWorldVisualization.createSocRoom();
    const restored = CyberWorldVisualization.fromJSON(viz.toJSON());
    expect(restored.id).toBe(viz.id);
    expect(restored.environmentType).toBe('soc');
    expect(restored.getEntities()).toHaveLength(viz.getEntities().length);
  });
});

describe('CyberWorldVisualization factories', () => {
  it('createSocRoom creates expected entities', () => {
    const viz = CyberWorldVisualization.createSocRoom();
    expect(viz.environmentType).toBe('soc');
    expect(viz.getEntities().length).toBeGreaterThanOrEqual(4);
    expect(viz.getEntity('main-display')).toBeDefined();
  });

  it('createServerRoom creates expected entities', () => {
    const viz = CyberWorldVisualization.createServerRoom();
    expect(viz.environmentType).toBe('server-room');
    expect(viz.getEntity('rack-1')).toBeDefined();
    expect(viz.getEntity('cooling-1')).toBeDefined();
  });

  it('createDataCenter creates expected entities', () => {
    const viz = CyberWorldVisualization.createDataCenter();
    expect(viz.environmentType).toBe('data-center');
    expect(viz.getEntities().length).toBeGreaterThanOrEqual(8);
    expect(viz.getEntity('network-spine')).toBeDefined();
  });

  it('createCorporateOffice creates expected entities', () => {
    const viz = CyberWorldVisualization.createCorporateOffice();
    expect(viz.environmentType).toBe('corporate-office');
    expect(viz.getEntity('server-closet')).toBeDefined();
  });

  it('createDigitalInfrastructure creates expected entities', () => {
    const viz = CyberWorldVisualization.createDigitalInfrastructure();
    expect(viz.environmentType).toBe('digital-infrastructure');
    expect(viz.getEntity('edge-firewall')).toBeDefined();
    expect(viz.getEntity('database-server')).toBeDefined();
  });
});

describe('CyberWorldVisualization scene generation', () => {
  it('builds a valid Scene3D with cyber entity meshes', () => {
    const viz = CyberWorldVisualization.createSocRoom();
    const scene = viz.buildScene3D();
    expect(() => scene.validate()).not.toThrow();

    const cyberMeshes = scene.getMeshes().filter(
      (mesh) => mesh.metadata?.kind === 'cyber-entity',
    );
    expect(cyberMeshes).toHaveLength(viz.getEntities().length);
    expect(scene.getCameras()).toHaveLength(1);
    expect(scene.getLights()).toHaveLength(2);
  });

  it('builds scenes for all environment types', () => {
    const factories = [
      CyberWorldVisualization.createSocRoom(),
      CyberWorldVisualization.createServerRoom(),
      CyberWorldVisualization.createDataCenter(),
      CyberWorldVisualization.createCorporateOffice(),
      CyberWorldVisualization.createDigitalInfrastructure(),
    ];

    for (const factory of factories) {
      const scene = factory.buildScene3D();
      expect(() => scene.validate()).not.toThrow();
      const cyberMeshes = scene.getMeshes().filter(
        (mesh) => mesh.metadata?.kind === 'cyber-entity',
      );
      expect(cyberMeshes.length).toBe(factory.getEntities().length);
    }
  });

  it('renders using Renderer3D', () => {
    const viz = CyberWorldVisualization.createServerRoom();
    const scene = viz.buildScene3D();
    const target = new RenderTarget({ id: 't', width: 1280, height: 720, mode: '3d' });
    const renderer = new Renderer3D();
    const result = renderer.render(scene, target);

    expect(result.backendId).toBe('renderer-3d');
    expect(result.stats).toMatchObject({
      meshCount: expect.any(Number),
      cameraCount: 1,
      lightCount: 2,
      commandCount: expect.any(Number),
    });
    expect(result.data!.commands.length).toBeGreaterThan(0);
  });
});
