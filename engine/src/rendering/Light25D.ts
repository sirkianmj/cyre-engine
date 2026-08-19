export type Light25DType = 'ambient' | 'directional' | 'point';

export interface Light25DOptions {
  id: string;
  name: string;
  type: Light25DType;
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
}

export class Light25D {
  readonly id: string;
  readonly name: string;
  readonly type: Light25DType;
  readonly color: string;
  readonly intensity: number;
  readonly position?: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly direction?: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };

  constructor(options: Light25DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Light25D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Light25D name is required.');
    }
    if (!['ambient', 'directional', 'point'].includes(options.type)) {
      throw new Error(`Invalid Light25D type "${options.type}".`);
    }
    if (
      options.intensity !== undefined &&
      (!Number.isFinite(options.intensity) || options.intensity < 0)
    ) {
      throw new Error('Light25D intensity must be a non-negative finite number.');
    }

    if (options.type === 'point' && options.position === undefined) {
      throw new Error('Point Light25D requires a position.');
    }
    if (options.type === 'directional' && options.direction === undefined) {
      throw new Error('Directional Light25D requires a direction.');
    }

    this.id = options.id;
    this.name = options.name;
    this.type = options.type;
    this.color = options.color ?? '#ffffff';
    this.intensity = options.intensity ?? 1;

    if (options.position !== undefined) {
      const { x, y, z } = options.position;
      for (const value of [x, y, z]) {
        if (!Number.isFinite(value)) {
          throw new Error('Light25D position values must be finite numbers.');
        }
      }
      this.position = { x, y, z };
    } else {
      this.position = undefined;
    }

    if (options.direction !== undefined) {
      const { x, y, z } = options.direction;
      for (const value of [x, y, z]) {
        if (!Number.isFinite(value)) {
          throw new Error('Light25D direction values must be finite numbers.');
        }
      }
      this.direction = { x, y, z };
    } else {
      this.direction = undefined;
    }
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): Light25D {
    return Light25D.fromJSON(this.toJSON());
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
    };
  }

  static fromJSON(data: Record<string, unknown>): Light25D {
    return new Light25D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      type: typeof data.type === 'string' ? (data.type as Light25DType) : 'ambient',
      color: typeof data.color === 'string' ? data.color : undefined,
      intensity: typeof data.intensity === 'number' ? data.intensity : undefined,
      position: data.position as { x: number; y: number; z: number } | undefined,
      direction: data.direction as { x: number; y: number; z: number } | undefined,
    });
  }
}
