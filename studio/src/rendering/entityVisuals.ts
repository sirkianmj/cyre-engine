export type EntityGeometry = 'box' | 'sphere' | 'cylinder';

export interface EntityVisual {
  color: string;
  geometry: EntityGeometry;
  label: string;
}

export const ENTITY_VISUALS: Record<string, EntityVisual> = {
  host: { color: '#4DA3FF', geometry: 'box', label: 'Host' },
  server: { color: '#3DDC97', geometry: 'box', label: 'Server' },
  client: { color: '#FFB020', geometry: 'box', label: 'Client' },
  router: { color: '#5AC8FA', geometry: 'sphere', label: 'Router' },
  firewall: { color: '#FF6B7A', geometry: 'cylinder', label: 'Firewall' },
  database: { color: '#C084FC', geometry: 'cylinder', label: 'Database' },
  service: { color: '#7C9CFF', geometry: 'sphere', label: 'Service' },
  network: { color: '#38BDF8', geometry: 'sphere', label: 'Network' },
  other: { color: '#8BA4C7', geometry: 'box', label: 'Entity' },
};

export function visualForType(type: string | undefined): EntityVisual {
  if (!type) return ENTITY_VISUALS.other;
  return ENTITY_VISUALS[type] ?? ENTITY_VISUALS.other;
}

export function worldFromGraph(
  x: number | undefined,
  y: number | undefined,
  index: number,
): { x: number; y: number; z: number } {
  const gx = x ?? 120 + (index % 5) * 160;
  const gy = y ?? 120 + Math.floor(index / 5) * 140;
  return {
    x: (gx - 400) / 80,
    y: 0,
    z: (gy - 280) / 80,
  };
}

export function graphFromWorld(x: number, z: number): { x: number; y: number } {
  return {
    x: x * 80 + 400,
    y: z * 80 + 280,
  };
}
