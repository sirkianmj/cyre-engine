export type RenderingMode = '2d' | '2.5d' | '3d' | 'headless';

export interface RenderTargetOptions {
  id: string;
  width: number;
  height: number;
  pixelRatio?: number;
  mode?: RenderingMode;
  metadata?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const VALID_MODES: readonly RenderingMode[] = ['2d', '2.5d', '3d', 'headless'];

export class RenderTarget {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly mode: RenderingMode;
  readonly metadata?: Record<string, unknown>;

  constructor(options: RenderTargetOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('RenderTarget id is required.');
    }

    if (!Number.isFinite(options.width) || options.width <= 0) {
      throw new Error('RenderTarget width must be a positive finite number.');
    }

    if (!Number.isFinite(options.height) || options.height <= 0) {
      throw new Error('RenderTarget height must be a positive finite number.');
    }

    if (
      options.pixelRatio !== undefined &&
      (!Number.isFinite(options.pixelRatio) || options.pixelRatio <= 0)
    ) {
      throw new Error('RenderTarget pixelRatio must be a positive finite number.');
    }

    if (options.mode !== undefined && !VALID_MODES.includes(options.mode)) {
      throw new Error(`Invalid rendering mode "${options.mode}".`);
    }

    this.id = options.id;
    this.width = options.width;
    this.height = options.height;
    this.pixelRatio = options.pixelRatio ?? 1;
    this.mode = options.mode ?? '2d';
    this.metadata = options.metadata !== undefined
      ? deepClone(options.metadata)
      : undefined;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('RenderTarget id is required.');
    }
    if (!Number.isFinite(this.width) || this.width <= 0) {
      throw new Error('RenderTarget width must be a positive finite number.');
    }
    if (!Number.isFinite(this.height) || this.height <= 0) {
      throw new Error('RenderTarget height must be a positive finite number.');
    }
    if (!Number.isFinite(this.pixelRatio) || this.pixelRatio <= 0) {
      throw new Error('RenderTarget pixelRatio must be a positive finite number.');
    }
    if (!VALID_MODES.includes(this.mode)) {
      throw new Error(`Invalid rendering mode "${this.mode}".`);
    }
  }

  clone(): RenderTarget {
    return RenderTarget.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      width: this.width,
      height: this.height,
      pixelRatio: this.pixelRatio,
      mode: this.mode,
      metadata: this.metadata !== undefined
        ? deepClone(this.metadata)
        : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): RenderTarget {
    return new RenderTarget({
      id: typeof data.id === 'string' ? data.id : '',
      width: typeof data.width === 'number' ? data.width : Number.NaN,
      height: typeof data.height === 'number' ? data.height : Number.NaN,
      pixelRatio: typeof data.pixelRatio === 'number' ? data.pixelRatio : undefined,
      mode: typeof data.mode === 'string' ? (data.mode as RenderingMode) : undefined,
      metadata: data.metadata !== undefined
        ? (data.metadata as Record<string, unknown>)
        : undefined,
    });
  }
}
