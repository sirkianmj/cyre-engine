export interface Layer2DOptions {
  id: string;
  name: string;
  zIndex?: number;
  visible?: boolean;
  opacity?: number;
}

export class Layer2D {
  readonly id: string;
  readonly name: string;
  readonly zIndex: number;
  readonly visible: boolean;
  readonly opacity: number;

  constructor(options: Layer2DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Layer2D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Layer2D name is required.');
    }
    if (
      options.zIndex !== undefined &&
      (!Number.isFinite(options.zIndex) || !Number.isInteger(options.zIndex))
    ) {
      throw new Error('Layer2D zIndex must be an integer.');
    }
    if (
      options.opacity !== undefined &&
      (typeof options.opacity !== 'number' || options.opacity < 0 || options.opacity > 1)
    ) {
      throw new Error('Layer2D opacity must be between 0 and 1.');
    }

    this.id = options.id;
    this.name = options.name;
    this.zIndex = options.zIndex ?? 0;
    this.visible = options.visible ?? true;
    this.opacity = options.opacity ?? 1;
  }

  validate(): void {
    // No additional validation needed beyond constructor.
  }

  clone(): Layer2D {
    return Layer2D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      zIndex: this.zIndex,
      visible: this.visible,
      opacity: this.opacity,
    };
  }

  static fromJSON(data: Record<string, unknown>): Layer2D {
    return new Layer2D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      zIndex: typeof data.zIndex === 'number' ? data.zIndex : 0,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
      opacity: typeof data.opacity === 'number' ? data.opacity : 1,
    });
  }
}
