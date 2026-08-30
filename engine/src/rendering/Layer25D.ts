export interface Layer25DOptions {
  id: string;
  name: string;
  order?: number;
  depth?: number;
  visible?: boolean;
  opacity?: number;
}

export class Layer25D {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly depth: number;
  readonly visible: boolean;
  readonly opacity: number;

  constructor(options: Layer25DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Layer25D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Layer25D name is required.');
    }

    const order = options.order ?? 0;
    const depth = options.depth ?? 0;
    const opacity = options.opacity ?? 1;

    if (!Number.isInteger(order)) {
      throw new Error('Layer25D order must be an integer.');
    }
    if (!Number.isFinite(depth)) {
      throw new Error('Layer25D depth must be a finite number.');
    }
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new Error('Layer25D opacity must be between 0 and 1.');
    }

    this.id = options.id;
    this.name = options.name;
    this.order = order;
    this.depth = depth;
    this.visible = options.visible ?? true;
    this.opacity = opacity;
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): Layer25D {
    return Layer25D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      order: this.order,
      depth: this.depth,
      visible: this.visible,
      opacity: this.opacity,
    };
  }

  static fromJSON(data: Record<string, unknown>): Layer25D {
    return new Layer25D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      order: typeof data.order === 'number' ? data.order : 0,
      depth: typeof data.depth === 'number' ? data.depth : 0,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
      opacity: typeof data.opacity === 'number' ? data.opacity : 1,
    });
  }
}
