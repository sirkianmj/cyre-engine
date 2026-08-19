export type Light3DType = 'ambient' | 'directional' | 'point' | 'spot';

export interface Light3DOptions {
  id: string;
  name: string;
  type: Light3DType;
  color?: string;
  intensity?: number;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  direction?: {
    x: number;
    y: number;
    z: number;
  };
  angle?: number;
  penumbra?: number;
}

type Point = { x: number; y: number; z: number };

function asPoint(data: Record<string, unknown> | undefined): Point | undefined {
  if (data === undefined) return undefined;
  return {
    x: typeof data.x === 'number' ? data.x : 0,
    y: typeof data.y === 'number' ? data.y : 0,
    z: typeof data.z === 'number' ? data.z : 0,
  };
}

export class Light3D {
  readonly id: string;
  readonly name: string;
  readonly type: Light3DType;
  readonly color: string;
  readonly intensity: number;
  readonly position?: { readonly x: number; readonly y: number; readonly z: number };
  readonly direction?: { readonly x: number; readonly y: number; readonly z: number };
  readonly angle?: number;
  readonly penumbra?: number;

  constructor(options: Light3DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Light3D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Light3D name is required.');
    }
    if (!['ambient', 'directional', 'point', 'spot'].includes(options.type)) {
      throw new Error(`Invalid Light3D type "${options.type}".`);
    }

    const intensity = options.intensity ?? 1;
    if (!Number.isFinite(intensity) || intensity < 0) {
      throw new Error('Light3D intensity must be a non-negative finite number.');
    }

    if (options.type === 'point' && options.position === undefined) {
      throw new Error('Point Light3D requires a position.');
    }
    if (options.type === 'directional' && options.direction === undefined) {
      throw new Error('Directional Light3D requires a direction.');
    }
    if (options.type === 'spot' && (options.position === undefined || options.direction === undefined)) {
      throw new Error('Spot Light3D requires both position and direction.');
    }

    const angle = options.angle;
    if (angle !== undefined && (!Number.isFinite(angle) || angle < 0 || angle > 180)) {
      throw new Error('Light3D angle must be between 0 and 180 degrees.');
    }
    const penumbra = options.penumbra;
    if (penumbra !== undefined && (!Number.isFinite(penumbra) || penumbra < 0 || penumbra > 1)) {
      throw new Error('Light3D penumbra must be between 0 and 1.');
    }

    this.id = options.id;
    this.name = options.name;
    this.type = options.type;
    this.color = options.color ?? '#ffffff';
    this.intensity = intensity;
    this.position = asPoint(options.position as Record<string, unknown> | undefined);
    this.direction = asPoint(options.direction as Record<string, unknown> | undefined);
    this.angle = angle;
    this.penumbra = penumbra;
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): Light3D {
    return Light3D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      color: this.color,
      intensity: this.intensity,
      position: this.position ? { ...this.position } : undefined,
      direction: this.direction ? { ...this.direction } : undefined,
      angle: this.angle,
      penumbra: this.penumbra,
    };
  }

  static fromJSON(data: Record<string, unknown>): Light3D {
    return new Light3D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      type: typeof data.type === 'string' ? (data.type as Light3DType) : 'ambient',
      color: typeof data.color === 'string' ? data.color : undefined,
      intensity: typeof data.intensity === 'number' ? data.intensity : undefined,
      position: data.position as { x: number; y: number; z: number } | undefined,
      direction: data.direction as { x: number; y: number; z: number } | undefined,
      angle: typeof data.angle === 'number' ? data.angle : undefined,
      penumbra: typeof data.penumbra === 'number' ? data.penumbra : undefined,
    });
  }
}
