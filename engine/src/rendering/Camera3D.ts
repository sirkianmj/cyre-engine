export interface Camera3DOptions {
  id: string;
  name: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  target?: {
    x: number;
    y: number;
    z: number;
  };
  up?: {
    x: number;
    y: number;
    z: number;
  };
  fov?: number;
  near?: number;
  far?: number;
  aspect?: number;
  visible?: boolean;
}

type Point = { x: number; y: number; z: number };

function asPoint(data: Record<string, unknown> | undefined, fallback: Point): Point {
  if (data === undefined) return { ...fallback };
  return {
    x: typeof data.x === 'number' ? data.x : fallback.x,
    y: typeof data.y === 'number' ? data.y : fallback.y,
    z: typeof data.z === 'number' ? data.z : fallback.z,
  };
}

export class Camera3D {
  readonly id: string;
  readonly name: string;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
  readonly up: { readonly x: number; readonly y: number; readonly z: number };
  readonly fov: number;
  readonly near: number;
  readonly far: number;
  readonly aspect: number;
  readonly visible: boolean;

  constructor(options: Camera3DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Camera3D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Camera3D name is required.');
    }

    const position = options.position ?? { x: 0, y: 0, z: 10 };
    const target = options.target ?? { x: 0, y: 0, z: 0 };
    const up = options.up ?? { x: 0, y: 1, z: 0 };
    const fov = options.fov ?? 60;
    const near = options.near ?? 0.1;
    const far = options.far ?? 1000;
    const aspect = options.aspect ?? 16 / 9;

    for (const value of [...Object.values(position), ...Object.values(target), ...Object.values(up), fov, near, far, aspect]) {
      if (!Number.isFinite(value)) {
        throw new Error('Camera3D numeric values must be finite.');
      }
    }

    if (fov <= 0 || fov >= 180) {
      throw new Error('Camera3D fov must be between 0 and 180 degrees.');
    }
    if (near <= 0) {
      throw new Error('Camera3D near must be positive.');
    }
    if (far <= near) {
      throw new Error('Camera3D far must be greater than near.');
    }
    if (aspect <= 0) {
      throw new Error('Camera3D aspect must be positive.');
    }

    this.id = options.id;
    this.name = options.name;
    this.position = { ...position };
    this.target = { ...target };
    this.up = { ...up };
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.aspect = aspect;
    this.visible = options.visible ?? true;
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): Camera3D {
    return Camera3D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      position: { ...this.position },
      target: { ...this.target },
      up: { ...this.up },
      fov: this.fov,
      near: this.near,
      far: this.far,
      aspect: this.aspect,
      visible: this.visible,
    };
  }

  static fromJSON(data: Record<string, unknown>): Camera3D {
    return new Camera3D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      position: asPoint(data.position as Record<string, unknown> | undefined, { x: 0, y: 0, z: 10 }),
      target: asPoint(data.target as Record<string, unknown> | undefined, { x: 0, y: 0, z: 0 }),
      up: asPoint(data.up as Record<string, unknown> | undefined, { x: 0, y: 1, z: 0 }),
      fov: typeof data.fov === 'number' ? data.fov : 60,
      near: typeof data.near === 'number' ? data.near : 0.1,
      far: typeof data.far === 'number' ? data.far : 1000,
      aspect: typeof data.aspect === 'number' ? data.aspect : 16 / 9,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
    });
  }
}
