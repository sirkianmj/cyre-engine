export interface Camera25DOptions {
  id: string;
  name: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  lookAt?: {
    x: number;
    y: number;
    z: number;
  };
  fov?: number;
  near?: number;
  far?: number;
  visible?: boolean;
}

function asPoint(
  data: Record<string, unknown> | undefined,
  fallback: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  if (data === undefined) return { ...fallback };
  return {
    x: typeof data.x === 'number' ? data.x : fallback.x,
    y: typeof data.y === 'number' ? data.y : fallback.y,
    z: typeof data.z === 'number' ? data.z : fallback.z,
  };
}

export class Camera25D {
  readonly id: string;
  readonly name: string;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly lookAt: { readonly x: number; readonly y: number; readonly z: number };
  readonly fov: number;
  readonly near: number;
  readonly far: number;
  readonly visible: boolean;

  constructor(options: Camera25DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Camera25D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Camera25D name is required.');
    }

    const position = options.position ?? { x: 0, y: 0, z: 10 };
    const lookAt = options.lookAt ?? { x: 0, y: 0, z: 0 };
    const fov = options.fov ?? 60;
    const near = options.near ?? 0.1;
    const far = options.far ?? 1000;

    for (const value of [...Object.values(position), ...Object.values(lookAt), fov, near, far]) {
      if (!Number.isFinite(value)) {
        throw new Error('Camera25D numeric values must be finite.');
      }
    }

    if (fov <= 0 || fov >= 180) {
      throw new Error('Camera25D fov must be between 0 and 180 degrees.');
    }
    if (near <= 0) {
      throw new Error('Camera25D near must be positive.');
    }
    if (far <= near) {
      throw new Error('Camera25D far must be greater than near.');
    }

    this.id = options.id;
    this.name = options.name;
    this.position = { ...position };
    this.lookAt = { ...lookAt };
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.visible = options.visible ?? true;
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): Camera25D {
    return Camera25D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      position: { ...this.position },
      lookAt: { ...this.lookAt },
      fov: this.fov,
      near: this.near,
      far: this.far,
      visible: this.visible,
    };
  }

  static fromJSON(data: Record<string, unknown>): Camera25D {
    return new Camera25D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      position: asPoint(data.position as Record<string, unknown> | undefined, { x: 0, y: 0, z: 10 }),
      lookAt: asPoint(data.lookAt as Record<string, unknown> | undefined, { x: 0, y: 0, z: 0 }),
      fov: typeof data.fov === 'number' ? data.fov : 60,
      near: typeof data.near === 'number' ? data.near : 0.1,
      far: typeof data.far === 'number' ? data.far : 1000,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
    });
  }
}
