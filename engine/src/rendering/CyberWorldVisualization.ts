import { Scene3D } from './Scene3D.js';
import { Material3D } from './Material3D.js';
import { Mesh3D, type Mesh3DGeometryType } from './Mesh3D.js';
import { Camera3D } from './Camera3D.js';
import { Light3D } from './Light3D.js';
import {
  CYBER_ENTITY_VISUAL_TYPES,
  CYBER_ENVIRONMENT_TYPES,
  cloneCyberVisualEntity,
  isCyberEntityVisualType,
  isCyberEnvironmentType,
  type CyberEntityVisualType,
  type CyberEnvironmentDefinition,
  type CyberEnvironmentType,
  type CyberVisualEntity,
  type Vector3,
} from './CyberWorldTypes.js';

function cloneRecord(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  return value !== undefined ? JSON.parse(JSON.stringify(value)) as Record<string, unknown> : undefined;
}

function finiteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function validateVector(vector: Vector3 | undefined, label: string): void {
  if (vector === undefined) return;
  finiteNumber(vector.x, `${label}.x`);
  finiteNumber(vector.y, `${label}.y`);
  finiteNumber(vector.z, `${label}.z`);
}

function validateCyberVisualEntity(entity: CyberVisualEntity): void {
  if (!entity.id || entity.id.trim() === '') {
    throw new Error('CyberVisualEntity id is required.');
  }
  if (!entity.name || entity.name.trim() === '') {
    throw new Error('CyberVisualEntity name is required.');
  }
  if (!isCyberEntityVisualType(entity.type)) {
    throw new Error(`Invalid CyberVisualEntity type "${entity.type}".`);
  }
  validateVector(entity.position, 'position');
  validateVector(entity.scale, 'scale');
  if (entity.scale !== undefined) {
    const { x, y, z } = entity.scale;
    if (x === 0 || y === 0 || z === 0) {
      throw new Error('CyberVisualEntity scale values cannot be zero.');
    }
  }
  if (entity.rotationY !== undefined) {
    finiteNumber(entity.rotationY, 'rotationY');
  }
  if (entity.color !== undefined && (typeof entity.color !== 'string' || entity.color.trim() === '')) {
    throw new Error('CyberVisualEntity color must be a non-empty string if provided.');
  }
  if (entity.label !== undefined && typeof entity.label !== 'string') {
    throw new Error('CyberVisualEntity label must be a string if provided.');
  }
  if (entity.metadata !== undefined && (typeof entity.metadata !== 'object' || entity.metadata === null)) {
    throw new Error('CyberVisualEntity metadata must be an object if provided.');
  }
}

const DEFAULT_COLORS: Record<CyberEntityVisualType, string> = {
  workstation: '#4f8cff',
  'server-rack': '#2b2b2b',
  display: '#19c9a7',
  'network-node': '#8a5cff',
  firewall: '#e74c3c',
  database: '#f39c12',
  router: '#2ecc71',
  switch: '#00bcd4',
  camera: '#9b59b6',
  user: '#ffb74d',
  server: '#33495f',
  terminal: '#50fa7b',
  'status-board': '#00e5ff',
  'cooling-unit': '#80d8ff',
  'power-unit': '#ff6e40',
};

const GEOMETRY_FOR_TYPE: Record<CyberEntityVisualType, Mesh3DGeometryType> = {
  workstation: 'box',
  'server-rack': 'box',
  display: 'plane',
  'network-node': 'sphere',
  firewall: 'box',
  database: 'cylinder',
  router: 'box',
  switch: 'box',
  camera: 'sphere',
  user: 'capsule',
  server: 'box',
  terminal: 'box',
  'status-board': 'plane',
  'cooling-unit': 'box',
  'power-unit': 'box',
};

function defaultPositionForType(type: CyberEntityVisualType): Vector3 {
  return { x: 0, y: 0.5, z: 0 };
}

function defaultScaleForType(type: CyberEntityVisualType): Vector3 {
  if (type === 'display' || type === 'status-board') {
    return { x: 2, y: 1, z: 0.1 };
  }
  if (type === 'server-rack' || type === 'server' || type === 'cooling-unit' || type === 'power-unit') {
    return { x: 1, y: 2, z: 1 };
  }
  if (type === 'camera' || type === 'network-node') {
    return { x: 0.4, y: 0.4, z: 0.4 };
  }
  if (type === 'user') {
    return { x: 0.6, y: 1.8, z: 0.6 };
  }
  if (type === 'database') {
    return { x: 0.8, y: 1.2, z: 0.8 };
  }
  return { x: 0.8, y: 0.6, z: 0.6 };
}

export class CyberWorldVisualization {
  readonly id: string;
  readonly name: string;
  readonly environmentType: CyberEnvironmentType;
  readonly settings?: Record<string, unknown>;
  private entities: Map<string, CyberVisualEntity>;

  constructor(definition: CyberEnvironmentDefinition) {
    if (!definition.id || definition.id.trim() === '') {
      throw new Error('CyberWorldVisualization id is required.');
    }
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('CyberWorldVisualization name is required.');
    }
    if (!isCyberEnvironmentType(definition.environmentType)) {
      throw new Error(`Invalid CyberWorldVisualization environmentType "${definition.environmentType}".`);
    }

    this.id = definition.id;
    this.name = definition.name;
    this.environmentType = definition.environmentType;
    this.settings = cloneRecord(definition.settings);
    this.entities = new Map();

    const initialEntities = definition.entities ?? [];
    if (!Array.isArray(initialEntities)) {
      throw new Error('CyberWorldVisualization entities must be an array if provided.');
    }
    for (const entity of initialEntities) {
      this.addEntity(entity);
    }
  }

  addEntity(entity: CyberVisualEntity): void {
    validateCyberVisualEntity(entity);
    if (this.entities.has(entity.id)) {
      throw new Error(`CyberVisualEntity "${entity.id}" already exists.`);
    }
    this.entities.set(entity.id, cloneCyberVisualEntity(entity));
  }

  getEntity(id: string): CyberVisualEntity | undefined {
    const entity = this.entities.get(id);
    return entity !== undefined ? cloneCyberVisualEntity(entity) : undefined;
  }

  getEntities(): CyberVisualEntity[] {
    return Array.from(this.entities.values()).map((entity) => cloneCyberVisualEntity(entity));
  }

  removeEntity(id: string): void {
    if (!this.entities.delete(id)) {
      throw new Error(`CyberVisualEntity "${id}" does not exist.`);
    }
  }

  validate(): void {
    for (const entity of this.entities.values()) {
      validateCyberVisualEntity(entity);
    }
  }

  clone(): CyberWorldVisualization {
    return CyberWorldVisualization.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      environmentType: this.environmentType,
      entities: this.getEntities(),
      settings: cloneRecord(this.settings),
    };
  }

  static fromJSON(data: Record<string, unknown>): CyberWorldVisualization {
    const rawEntities = Array.isArray(data.entities)
      ? (data.entities as CyberVisualEntity[])
      : [];

    return new CyberWorldVisualization({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      environmentType: typeof data.environmentType === 'string'
        ? (data.environmentType as CyberEnvironmentType)
        : 'soc',
      entities: rawEntities.map((entity) => ({
        id: typeof entity.id === 'string' ? entity.id : '',
        name: typeof entity.name === 'string' ? entity.name : '',
        type: typeof entity.type === 'string' ? (entity.type as CyberEntityVisualType) : 'workstation',
        position: entity.position,
        scale: entity.scale,
        color: entity.color,
        rotationY: entity.rotationY,
        label: entity.label,
        metadata: entity.metadata,
      })),
      settings: data.settings as Record<string, unknown> | undefined,
    });
  }

  buildScene3D(): Scene3D {
    const scene = new Scene3D();

    scene.addMaterial(new Material3D({
      id: 'environment-floor-material',
      name: 'Environment Floor',
      color: '#1b1e22',
      roughness: 0.92,
      metallic: 0.02,
    }));

    scene.addMesh(new Mesh3D({
      id: 'environment-floor',
      name: 'Floor',
      materialId: 'environment-floor-material',
      geometryType: 'plane',
      transform: {
        x: 0,
        y: 0,
        z: 0,
        scaleX: 30,
        scaleY: 1,
        scaleZ: 30,
      },
      receiveShadow: true,
      metadata: {
        kind: 'environment',
        element: 'floor',
      },
    }));

    scene.addLight(new Light3D({
      id: 'environment-ambient',
      name: 'Ambient Light',
      type: 'ambient',
      intensity: 0.55,
    }));

    scene.addLight(new Light3D({
      id: 'environment-directional',
      name: 'Directional Light',
      type: 'directional',
      direction: { x: -0.5, y: -1, z: -0.35 },
      intensity: 1.3,
    }));

    scene.addCamera(this.createEnvironmentCamera());

    const materialIdsByColor = new Map<string, string>();
    let materialCounter = 0;

    const getMaterialForColor = (color: string): string => {
      let materialId = materialIdsByColor.get(color);
      if (materialId === undefined) {
        materialCounter += 1;
        materialId = `environment-material-${materialCounter}`;
        scene.addMaterial(new Material3D({
          id: materialId,
          name: `Cyber Material ${materialCounter}`,
          color,
          roughness: 0.55,
          metallic: 0.2,
        }));
        materialIdsByColor.set(color, materialId);
      }
      return materialId;
    };

    for (const entity of this.entities.values()) {
      const color = entity.color ?? DEFAULT_COLORS[entity.type];
      const materialId = getMaterialForColor(color);
      const geometryType = GEOMETRY_FOR_TYPE[entity.type];
      const position = entity.position ?? defaultPositionForType(entity.type);
      const scale = entity.scale ?? defaultScaleForType(entity.type);
      const rotationY = entity.rotationY ?? 0;

      scene.addMesh(new Mesh3D({
        id: `entity-mesh-${entity.id}`,
        name: entity.name,
        materialId,
        geometryType,
        transform: {
          x: position.x,
          y: position.y,
          z: position.z,
          rotationY,
          scaleX: scale.x,
          scaleY: scale.y,
          scaleZ: scale.z,
        },
        castShadow: true,
        receiveShadow: true,
        metadata: {
          kind: 'cyber-entity',
          cyberId: entity.id,
          cyberType: entity.type,
          label: entity.label,
          ...(entity.metadata ?? {}),
        },
      }));
    }

    scene.validate();
    return scene;
  }

  private createEnvironmentCamera(): Camera3D {
    const positions: Record<CyberEnvironmentType, Vector3> = {
      'soc': { x: 0, y: 8, z: 14 },
      'server-room': { x: 0, y: 6, z: 12 },
      'data-center': { x: 0, y: 10, z: 20 },
      'corporate-office': { x: 0, y: 7, z: 14 },
      'digital-infrastructure': { x: 0, y: 5, z: 15 },
    };
    const position = positions[this.environmentType];
    return new Camera3D({
      id: `camera-${this.environmentType}`,
      name: 'Environment Camera',
      position,
      target: { x: 0, y: 1.2, z: 0 },
      fov: 55,
      near: 0.1,
      far: 100,
      aspect: 16 / 9,
    });
  }

  static createSocRoom(options: { id?: string; name?: string } = {}): CyberWorldVisualization {
    return new CyberWorldVisualization({
      id: options.id ?? 'soc-room',
      name: options.name ?? 'Security Operations Center',
      environmentType: 'soc',
      entities: [
        { id: 'analyst-1', name: 'SOC Analyst Workstation', type: 'workstation', position: { x: -4, y: 0, z: -3 } },
        { id: 'analyst-2', name: 'SOC Analyst Workstation', type: 'workstation', position: { x: 0, y: 0, z: -3 } },
        { id: 'analyst-3', name: 'SOC Analyst Workstation', type: 'workstation', position: { x: 4, y: 0, z: -3 } },
        { id: 'main-display', name: 'Main Video Wall', type: 'display', position: { x: 0, y: 3.2, z: -8 }, scale: { x: 12, y: 3, z: 0.1 } },
        { id: 'status-board', name: 'Incident Status Board', type: 'status-board', position: { x: 0, y: 2.2, z: -7.8 }, scale: { x: 8, y: 2.5, z: 0.1 } },
      ],
      settings: {
        floorSize: 30,
        ceilingHeight: 4.5,
        theme: 'blue-ops',
      },
    });
  }

  static createServerRoom(options: { id?: string; name?: string } = {}): CyberWorldVisualization {
    return new CyberWorldVisualization({
      id: options.id ?? 'server-room',
      name: options.name ?? 'On-Premises Server Room',
      environmentType: 'server-room',
      entities: [
        { id: 'rack-1', name: 'Server Rack A', type: 'server-rack', position: { x: -3, y: 1, z: -3 } },
        { id: 'rack-2', name: 'Server Rack B', type: 'server-rack', position: { x: 0, y: 1, z: -3 } },
        { id: 'rack-3', name: 'Server Rack C', type: 'server-rack', position: { x: 3, y: 1, z: -3 } },
        { id: 'cooling-1', name: 'Cooling Unit', type: 'cooling-unit', position: { x: -6, y: 0, z: -2 } },
        { id: 'power-1', name: 'Power Distribution Unit', type: 'power-unit', position: { x: 6, y: 0, z: -2 } },
        { id: 'security-camera', name: 'Security Camera', type: 'camera', position: { x: 0, y: 3.8, z: -7 } },
      ],
      settings: {
        floorSize: 30,
        ceilingHeight: 5,
        theme: 'server-metal',
      },
    });
  }

  static createDataCenter(options: { id?: string; name?: string } = {}): CyberWorldVisualization {
    return new CyberWorldVisualization({
      id: options.id ?? 'data-center',
      name: options.name ?? 'Cloud Data Center',
      environmentType: 'data-center',
      entities: [
        { id: 'rack-row-1-a', name: 'Rack Row 1 A', type: 'server-rack', position: { x: -6, y: 1, z: -4 } },
        { id: 'rack-row-1-b', name: 'Rack Row 1 B', type: 'server-rack', position: { x: -3, y: 1, z: -4 } },
        { id: 'rack-row-1-c', name: 'Rack Row 1 C', type: 'server-rack', position: { x: 0, y: 1, z: -4 } },
        { id: 'rack-row-2-a', name: 'Rack Row 2 A', type: 'server-rack', position: { x: 3, y: 1, z: -4 } },
        { id: 'rack-row-2-b', name: 'Rack Row 2 B', type: 'server-rack', position: { x: 6, y: 1, z: -4 } },
        { id: 'network-spine', name: 'Network Spine', type: 'switch', position: { x: 0, y: 2.5, z: 0 } },
        { id: 'database-node', name: 'Primary Database Node', type: 'database', position: { x: 0, y: 0, z: 2 } },
        { id: 'firewall-appliance', name: 'Edge Firewall Appliance', type: 'firewall', position: { x: 0, y: 0.5, z: 6 } },
        { id: 'cooling-row', name: 'Cooling Row Unit', type: 'cooling-unit', position: { x: 8, y: 0, z: -2 } },
        { id: 'power-row', name: 'Power Row Unit', type: 'power-unit', position: { x: -8, y: 0, z: -2 } },
      ],
      settings: {
        floorSize: 50,
        ceilingHeight: 7,
        theme: 'data-center',
      },
    });
  }

  static createCorporateOffice(options: { id?: string; name?: string } = {}): CyberWorldVisualization {
    return new CyberWorldVisualization({
      id: options.id ?? 'corporate-office',
      name: options.name ?? 'Corporate Office Floor',
      environmentType: 'corporate-office',
      entities: [
        { id: 'employee-1', name: 'Employee Workstation', type: 'workstation', position: { x: -4, y: 0, z: -3 } },
        { id: 'employee-2', name: 'Employee Workstation', type: 'workstation', position: { x: 0, y: 0, z: -3 } },
        { id: 'employee-3', name: 'Employee Workstation', type: 'workstation', position: { x: 4, y: 0, z: -3 } },
        { id: 'server-closet', name: 'Server Closet', type: 'server-rack', position: { x: -8, y: 1, z: 5 } },
        { id: 'conference-display', name: 'Conference Display', type: 'display', position: { x: 8, y: 2.5, z: 5 }, scale: { x: 5, y: 2, z: 0.1 } },
        { id: 'office-router', name: 'Branch Router', type: 'router', position: { x: 0, y: 0.5, z: 5 } },
      ],
      settings: {
        floorSize: 30,
        ceilingHeight: 4,
        theme: 'corporate-day',
      },
    });
  }

  static createDigitalInfrastructure(options: { id?: string; name?: string } = {}): CyberWorldVisualization {
    return new CyberWorldVisualization({
      id: options.id ?? 'digital-infrastructure',
      name: options.name ?? 'Abstract Digital Infrastructure',
      environmentType: 'digital-infrastructure',
      entities: [
        { id: 'internet-node', name: 'Internet', type: 'network-node', position: { x: 0, y: 8, z: -12 }, color: '#ff3860' },
        { id: 'edge-firewall', name: 'Edge Firewall', type: 'firewall', position: { x: 0, y: 6, z: -8 } },
        { id: 'vpn-gateway', name: 'VPN Gateway', type: 'router', position: { x: 0, y: 4, z: -4 } },
        { id: 'internal-switch', name: 'Internal Switch', type: 'switch', position: { x: 0, y: 2, z: 0 } },
        { id: 'database-server', name: 'Database Server', type: 'database', position: { x: -4, y: 0, z: 4 } },
        { id: 'app-server', name: 'Application Server', type: 'server', position: { x: 4, y: 0, z: 4 } },
        { id: 'analyst-terminal', name: 'Analyst Terminal', type: 'terminal', position: { x: 0, y: 0, z: 8 } },
      ],
      settings: {
        theme: 'digital-map',
        floorSize: 40,
      },
    });
  }
}
