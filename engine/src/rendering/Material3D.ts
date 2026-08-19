export interface Material3DOptions {
  id: string;
  name: string;
  color?: string;
  roughness?: number;
  metallic?: number;
  opacity?: number;
  doubleSided?: boolean;
  textureId?: string;
  assetId?: string;
}

export class Material3D {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly roughness: number;
  readonly metallic: number;
  readonly opacity: number;
  readonly doubleSided: boolean;
  readonly textureId?: string;
  readonly assetId?: string;

  constructor(options: Material3DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Material3D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Material3D name is required.');
    }

    const roughness = options.roughness ?? 0.5;
    const metallic = options.metallic ?? 0;
    const opacity = options.opacity ?? 1;

    if (!Number.isFinite(roughness) || roughness < 0 || roughness > 1) {
      throw new Error('Material3D roughness must be between 0 and 1.');
    }
    if (!Number.isFinite(metallic) || metallic < 0 || metallic > 1) {
      throw new Error('Material3D metallic must be between 0 and 1.');
    }
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new Error('Material3D opacity must be between 0 and 1.');
    }
    if (options.textureId !== undefined && options.textureId.trim() === '') {
      throw new Error('Material3D textureId cannot be empty if provided.');
    }
    if (options.assetId !== undefined && options.assetId.trim() === '') {
      throw new Error('Material3D assetId cannot be empty if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.color = options.color ?? '#ffffff';
    this.roughness = roughness;
    this.metallic = metallic;
    this.opacity = opacity;
    this.doubleSided = options.doubleSided ?? false;
    this.textureId = options.textureId;
    this.assetId = options.assetId;
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): Material3D {
    return Material3D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      roughness: this.roughness,
      metallic: this.metallic,
      opacity: this.opacity,
      doubleSided: this.doubleSided,
      textureId: this.textureId,
      assetId: this.assetId,
    };
  }

  static fromJSON(data: Record<string, unknown>): Material3D {
    return new Material3D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      color: typeof data.color === 'string' ? data.color : undefined,
      roughness: typeof data.roughness === 'number' ? data.roughness : undefined,
      metallic: typeof data.metallic === 'number' ? data.metallic : undefined,
      opacity: typeof data.opacity === 'number' ? data.opacity : undefined,
      doubleSided: typeof data.doubleSided === 'boolean' ? data.doubleSided : undefined,
      textureId: typeof data.textureId === 'string' ? data.textureId : undefined,
      assetId: typeof data.assetId === 'string' ? data.assetId : undefined,
    });
  }
}
