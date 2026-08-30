import { Transform3D } from './Transform3D.js';

export type Mesh3DGeometryType = 'box' | 'sphere' | 'plane' | 'cylinder' | 'capsule' | 'custom';

export interface Mesh3DOptions {
  id: string;
  name: string;
  materialId: string;
  geometryType?: Mesh3DGeometryType;
  transform?: Transform3D | Record<string, unknown>;
  visible?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  assetId?: string;
  metadata?: Record<string, unknown>;
}

const VALID_GEOMETRY_TYPES: readonly Mesh3DGeometryType[] = [
  'box',
  'sphere',
  'plane',
  'cylinder',
  'capsule',
  'custom',
];

export class Mesh3D {
  readonly id: string;
  readonly name: string;
  readonly materialId: string;
  readonly geometryType: Mesh3DGeometryType;
  readonly transform: Transform3D;
  readonly visible: boolean;
  readonly castShadow: boolean;
  readonly receiveShadow: boolean;
  readonly assetId?: string;
  readonly metadata?: Record<string, unknown>;

  constructor(options: Mesh3DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Mesh3D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Mesh3D name is required.');
    }
    if (!options.materialId || options.materialId.trim() === '') {
      throw new Error('Mesh3D materialId is required.');
    }
    if (options.assetId !== undefined && options.assetId.trim() === '') {
      throw new Error('Mesh3D assetId cannot be empty if provided.');
    }

    const geometryType = options.geometryType ?? 'box';
    if (!VALID_GEOMETRY_TYPES.includes(geometryType)) {
      throw new Error(`Invalid Mesh3D geometry type "${geometryType}".`);
    }

    this.id = options.id;
    this.name = options.name;
    this.materialId = options.materialId;
    this.geometryType = geometryType;
    this.transform = options.transform instanceof Transform3D
      ? options.transform.clone()
      : Transform3D.fromJSON(options.transform ?? {});
    this.visible = options.visible ?? true;
    this.castShadow = options.castShadow ?? false;
    this.receiveShadow = options.receiveShadow ?? false;
    this.assetId = options.assetId;
    this.metadata = options.metadata !== undefined
      ? JSON.parse(JSON.stringify(options.metadata))
      : undefined;
  }

  validate(): void {
    this.transform.validate();
  }

  clone(): Mesh3D {
    return Mesh3D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      materialId: this.materialId,
      geometryType: this.geometryType,
      transform: this.transform.toJSON(),
      visible: this.visible,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      assetId: this.assetId,
      metadata: this.metadata !== undefined
        ? JSON.parse(JSON.stringify(this.metadata))
        : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): Mesh3D {
    return new Mesh3D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      materialId: typeof data.materialId === 'string' ? data.materialId : '',
      geometryType: typeof data.geometryType === 'string'
        ? (data.geometryType as Mesh3DGeometryType)
        : 'box',
      transform: data.transform as Record<string, unknown>,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
      castShadow: typeof data.castShadow === 'boolean' ? data.castShadow : false,
      receiveShadow: typeof data.receiveShadow === 'boolean' ? data.receiveShadow : false,
      assetId: typeof data.assetId === 'string' ? data.assetId : undefined,
      metadata: data.metadata as Record<string, unknown>,
    });
  }
}
