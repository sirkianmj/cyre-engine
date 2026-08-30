import { Transform2D } from './Transform2D.js';

export interface Sprite2DOptions {
  id: string;
  name: string;
  textureId?: string;
  transform?: Transform2D | Record<string, unknown>;
  color?: string;
  layerId?: string;
  visible?: boolean;
  opacity?: number;
  metadata?: Record<string, unknown>;
}

export class Sprite2D {
  readonly id: string;
  readonly name: string;
  readonly textureId?: string;
  readonly transform: Transform2D;
  readonly color?: string;
  readonly layerId?: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly metadata?: Record<string, unknown>;

  constructor(options: Sprite2DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Sprite2D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Sprite2D name is required.');
    }
    if (options.textureId !== undefined && options.textureId.trim() === '') {
      throw new Error('Sprite2D textureId cannot be empty if provided.');
    }
    if (options.layerId !== undefined && options.layerId.trim() === '') {
      throw new Error('Sprite2D layerId cannot be empty if provided.');
    }
    if (
      options.opacity !== undefined &&
      (typeof options.opacity !== 'number' || options.opacity < 0 || options.opacity > 1)
    ) {
      throw new Error('Sprite2D opacity must be between 0 and 1.');
    }

    this.id = options.id;
    this.name = options.name;
    this.textureId = options.textureId;
    this.transform = options.transform instanceof Transform2D
      ? options.transform.clone()
      : Transform2D.fromJSON(options.transform ?? {});
    this.color = options.color;
    this.layerId = options.layerId;
    this.visible = options.visible ?? true;
    this.opacity = options.opacity ?? 1;
    this.metadata = options.metadata !== undefined
      ? JSON.parse(JSON.stringify(options.metadata))
      : undefined;
  }

  validate(): void {
    this.transform.validate();
  }

  clone(): Sprite2D {
    return Sprite2D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      textureId: this.textureId,
      transform: this.transform.toJSON(),
      color: this.color,
      layerId: this.layerId,
      visible: this.visible,
      opacity: this.opacity,
      metadata: this.metadata !== undefined
        ? JSON.parse(JSON.stringify(this.metadata))
        : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): Sprite2D {
    return new Sprite2D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      textureId: typeof data.textureId === 'string' ? data.textureId : undefined,
      transform: data.transform as Record<string, unknown>,
      color: typeof data.color === 'string' ? data.color : undefined,
      layerId: typeof data.layerId === 'string' ? data.layerId : undefined,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
      opacity: typeof data.opacity === 'number' ? data.opacity : 1,
      metadata: data.metadata as Record<string, unknown>,
    });
  }
}
