export interface Transform2DOptions {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;
}

export class Transform2D {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly originX: number;
  readonly originY: number;

  constructor(options: Transform2DOptions = {}) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.rotation = options.rotation ?? 0;
    this.scaleX = options.scaleX ?? 1;
    this.scaleY = options.scaleY ?? 1;
    this.originX = options.originX ?? 0;
    this.originY = options.originY ?? 0;
    this.validate();
  }

  validate(): void {
    const values = [
      this.x,
      this.y,
      this.rotation,
      this.scaleX,
      this.scaleY,
      this.originX,
      this.originY,
    ];
    for (const value of values) {
      if (!Number.isFinite(value)) {
        throw new Error('Transform2D values must be finite numbers.');
      }
    }
    if (this.scaleX === 0 || this.scaleY === 0) {
      throw new Error('Transform2D scale cannot be zero.');
    }
  }

  clone(): Transform2D {
    return Transform2D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      originX: this.originX,
      originY: this.originY,
    };
  }

  static fromJSON(data: Record<string, unknown>): Transform2D {
    return new Transform2D({
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      rotation: typeof data.rotation === 'number' ? data.rotation : 0,
      scaleX: typeof data.scaleX === 'number' ? data.scaleX : 1,
      scaleY: typeof data.scaleY === 'number' ? data.scaleY : 1,
      originX: typeof data.originX === 'number' ? data.originX : 0,
      originY: typeof data.originY === 'number' ? data.originY : 0,
    });
  }
}
