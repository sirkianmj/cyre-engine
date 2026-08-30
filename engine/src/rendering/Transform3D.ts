export interface Transform3DOptions {
  x?: number;
  y?: number;
  z?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}

export class Transform3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotationX: number;
  readonly rotationY: number;
  readonly rotationZ: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;

  constructor(options: Transform3DOptions = {}) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.z = options.z ?? 0;
    this.rotationX = options.rotationX ?? 0;
    this.rotationY = options.rotationY ?? 0;
    this.rotationZ = options.rotationZ ?? 0;
    this.scaleX = options.scaleX ?? 1;
    this.scaleY = options.scaleY ?? 1;
    this.scaleZ = options.scaleZ ?? 1;
    this.validate();
  }

  validate(): void {
    const values = [
      this.x,
      this.y,
      this.z,
      this.rotationX,
      this.rotationY,
      this.rotationZ,
      this.scaleX,
      this.scaleY,
      this.scaleZ,
    ];
    for (const value of values) {
      if (!Number.isFinite(value)) {
        throw new Error('Transform3D values must be finite numbers.');
      }
    }
    if (this.scaleX === 0 || this.scaleY === 0 || this.scaleZ === 0) {
      throw new Error('Transform3D scale values cannot be zero.');
    }
  }

  clone(): Transform3D {
    return Transform3D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      rotationX: this.rotationX,
      rotationY: this.rotationY,
      rotationZ: this.rotationZ,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      scaleZ: this.scaleZ,
    };
  }

  static fromJSON(data: Record<string, unknown>): Transform3D {
    return new Transform3D({
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      z: typeof data.z === 'number' ? data.z : 0,
      rotationX: typeof data.rotationX === 'number' ? data.rotationX : 0,
      rotationY: typeof data.rotationY === 'number' ? data.rotationY : 0,
      rotationZ: typeof data.rotationZ === 'number' ? data.rotationZ : 0,
      scaleX: typeof data.scaleX === 'number' ? data.scaleX : 1,
      scaleY: typeof data.scaleY === 'number' ? data.scaleY : 1,
      scaleZ: typeof data.scaleZ === 'number' ? data.scaleZ : 1,
    });
  }
}
