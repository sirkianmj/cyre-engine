export type CyberEnvironmentType =
  | 'soc'
  | 'server-room'
  | 'data-center'
  | 'corporate-office'
  | 'digital-infrastructure';

export type CyberEntityVisualType =
  | 'workstation'
  | 'server-rack'
  | 'display'
  | 'network-node'
  | 'firewall'
  | 'database'
  | 'router'
  | 'switch'
  | 'camera'
  | 'user'
  | 'server'
  | 'terminal'
  | 'status-board'
  | 'cooling-unit'
  | 'power-unit';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CyberVisualEntity {
  id: string;
  name: string;
  type: CyberEntityVisualType;
  position?: Vector3;
  scale?: Vector3;
  color?: string;
  rotationY?: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface CyberEnvironmentDefinition {
  id: string;
  name: string;
  environmentType: CyberEnvironmentType;
  entities?: CyberVisualEntity[];
  settings?: Record<string, unknown>;
}

export const CYBER_ENVIRONMENT_TYPES: readonly CyberEnvironmentType[] = [
  'soc',
  'server-room',
  'data-center',
  'corporate-office',
  'digital-infrastructure',
];

export const CYBER_ENTITY_VISUAL_TYPES: readonly CyberEntityVisualType[] = [
  'workstation',
  'server-rack',
  'display',
  'network-node',
  'firewall',
  'database',
  'router',
  'switch',
  'camera',
  'user',
  'server',
  'terminal',
  'status-board',
  'cooling-unit',
  'power-unit',
];

export function isCyberEnvironmentType(value: string): value is CyberEnvironmentType {
  return CYBER_ENVIRONMENT_TYPES.includes(value as CyberEnvironmentType);
}

export function isCyberEntityVisualType(value: string): value is CyberEntityVisualType {
  return CYBER_ENTITY_VISUAL_TYPES.includes(value as CyberEntityVisualType);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneVector3(value: Vector3): Vector3 {
  return { x: value.x, y: value.y, z: value.z };
}

export function cloneCyberVisualEntity(entity: CyberVisualEntity): CyberVisualEntity {
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    position: entity.position !== undefined ? cloneVector3(entity.position) : undefined,
    scale: entity.scale !== undefined ? cloneVector3(entity.scale) : undefined,
    color: entity.color,
    rotationY: entity.rotationY,
    label: entity.label,
    metadata: entity.metadata !== undefined ? deepClone(entity.metadata) : undefined,
  };
}
