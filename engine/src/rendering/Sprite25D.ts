import { Transform25D } from './Transform25D.js';

export interface Sprite25DOptions {
  id: string;
  name: string;
  layerId?: string;
  textureId?: string;
  transform?: Transform25D | Record<string, unknown>;
  color?: string;
  visible?: boolean;
  opacity?: number;
  metadata?: Record<string, unknown>;
}

export class Sprite25D {
  readonly id: string;
  readonly name: string;
  readonly layerId?: string;
  readonly textureId?: string;
  readonly transform: Transform25D;
  readonly color?: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly metadata?: Record<string, unknown>;

  constructor(options: Sprite25DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Sprite25D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Sprite25D name is required.');
    }
    if (options.layerId !== undefined && options.layerId.trim() === '') {
      throw new Error('Sprite25D layerId cannot be empty if provided.');
    }
    if (options.textureId !== undefined && options.textureId.trim() === '') {
      throw new Error('Sprite25D textureId cannot be empty if provided.');
    }
    if (
      options.opacity !== undefined &&
      (!Number.isFinite(options.opacity) || options.opacity < 0 || options.opacity > 1)
    ) {
      throw new Error('Sprite25D opacity must be between 0 and 1.');
    }

    this.id = options.id;
    this.name = options.name;
    this.layerId = options.layerId;
    this.textureId = options.textureId;
    this.transform = options.transform instanceof Transform25D
      ? options.transform.clone()
      : Transform25D.fromJSON(options.transform ?? {});
    this.color = options.color;
    this.visible = options.visible ?? true;
    this.opacity = options.opacity ?? 1;
    this.metadata = options.metadata !== undefined
      ? JSON.parse(JSON.stringify(options.metadata))
      : undefined;
  }

  validate(): void {
    this.transform.validate();
  }

  clone(): Sprite25D {
    return Sprite25D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      layerId: this.layerId,
      textureId: this.textureId,
      transform: this.transform.toJSON(),
      color: this.color,
      visible: this.visible,
      opacity: this.opacity,
      metadata: this.metadata !== undefined
        ? JSON.parse(JSON.stringify(this.metadata))
        : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): Sprite25D {
    return new Sprite25D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      layerId: typeof data.layerId === 'string' ? data.layerId : undefined,
      textureId: typeof data.textureId === 'string' ? data.textureId : undefined,
      transform: data.transform as Record<string, unknown>,
      color: typeof data.color === 'string' ? data.color : undefined,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
      opacity: typeof data.opacity === 'number' ? data.opacity : 1,
      metadata: data.metadata as Record<string, unknown>,
    });
  }
}
