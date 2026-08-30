export type SceneComponentType =
  | 'organization'
  | 'network'
  | 'host'
  | 'user'
  | 'service'
  | 'security-control'
  | 'environment'
  | 'mission-state';

export interface SceneComponent {
  id: string;
  type: SceneComponentType;
  name: string;
  data?: Record<string, unknown>;
}

export interface SceneData {
  id: string;
  name: string;
  components: SceneComponent[];
}

export interface SceneOrganizationData {
  id: string;
  name: string;
  industry?: string;
  description?: string;
}

export interface SceneNetworkData {
  id: string;
  name: string;
  nodes: string[];
  edges: Array<{ source: string; target: string }>;
}

export interface SceneHostData {
  id: string;
  hostId: string;
  displayName?: string;
  position?: { x: number; y: number; z?: number };
}

export interface SceneUserData {
  id: string;
  userId: string;
}

export interface SceneServiceData {
  id: string;
  serviceId: string;
}

export interface SceneSecurityControlData {
  id: string;
  controlId: string;
  enabled: boolean;
}

export interface SceneEnvironmentData {
  id: string;
  type: '2d' | '2.5d' | '3d';
  settings: Record<string, unknown>;
}

export interface SceneMissionStateData {
  id: string;
  missionId?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  objectives: string[];
}
