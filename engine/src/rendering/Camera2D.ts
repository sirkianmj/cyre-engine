export interface Camera2DOptions {
  id: string;
  name: string;
  x?: number;
  y?: number;
  zoom?: number;
  rotation?: number;
  width?: number;
  height?: number;
  visible?: boolean;
}

export class Camera2D {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly rotation: number;
  readonly width: number;
  readonly height: number;
  readonly visible: boolean;

  constructor(options: Camera2DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Camera2D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Camera2D name is required.');
    }

    const x = options.x ?? 0;
    const y = options.y ?? 0;
    const zoom = options.zoom ?? 1;
    const rotation = options.rotation ?? 0;
    const width = options.width ?? 800;
    const height = options.height ?? 600;

    for (const value of [x, y, zoom, rotation, width, height]) {
      if (!Number.isFinite(value)) {
        throw new Error('Camera2D numeric values must be finite.');
      }
    }
    if (zoom <= 0) {
      throw new Error('Camera2D zoom must be positive.');
    }
    if (width <= 0 || height <= 0) {
      throw new Error('Camera2D width and height must be positive.');
    }

    this.id = options.id;
    this.name = options.name;
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.rotation = rotation;
    this.width = width;
    this.height = height;
    this.visible = options.visible ?? true;
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): Camera2D {
    return Camera2D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      rotation: this.rotation,
      width: this.width,
      height: this.height,
      visible: this.visible,
    };
  }

  static fromJSON(data: Record<string, unknown>): Camera2D {
    return new Camera2D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      zoom: typeof data.zoom === 'number' ? data.zoom : 1,
      rotation: typeof data.rotation === 'number' ? data.rotation : 0,
      width: typeof data.width === 'number' ? data.width : 800,
      height: typeof data.height === 'number' ? data.height : 600,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
    });
  }
}
