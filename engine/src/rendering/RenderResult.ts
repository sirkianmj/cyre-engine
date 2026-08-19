export interface RenderResultOptions {
  frameNumber: number;
  backendId: string;
  targetId: string;
  renderedAt?: number;
  stats?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class RenderResult {
  readonly frameNumber: number;
  readonly backendId: string;
  readonly targetId: string;
  readonly renderedAt: number;
  readonly stats?: Record<string, unknown>;
  readonly data?: Record<string, unknown>;

  constructor(options: RenderResultOptions) {
    if (!Number.isInteger(options.frameNumber) || options.frameNumber < 0) {
      throw new Error('RenderResult frameNumber must be a non-negative integer.');
    }
    if (!options.backendId || options.backendId.trim() === '') {
      throw new Error('RenderResult backendId is required.');
    }
    if (!options.targetId || options.targetId.trim() === '') {
      throw new Error('RenderResult targetId is required.');
    }

    this.frameNumber = options.frameNumber;
    this.backendId = options.backendId;
    this.targetId = options.targetId;
    this.renderedAt = options.renderedAt ?? Date.now();
    this.stats = options.stats !== undefined ? deepClone(options.stats) : undefined;
    this.data = options.data !== undefined ? deepClone(options.data) : undefined;
  }

  validate(): void {
    if (!Number.isInteger(this.frameNumber) || this.frameNumber < 0) {
      throw new Error('RenderResult frameNumber must be a non-negative integer.');
    }
    if (!this.backendId || this.backendId.trim() === '') {
      throw new Error('RenderResult backendId is required.');
    }
    if (!this.targetId || this.targetId.trim() === '') {
      throw new Error('RenderResult targetId is required.');
    }
  }

  clone(): RenderResult {
    return RenderResult.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      frameNumber: this.frameNumber,
      backendId: this.backendId,
      targetId: this.targetId,
      renderedAt: this.renderedAt,
      stats: this.stats !== undefined ? deepClone(this.stats) : undefined,
      data: this.data !== undefined ? deepClone(this.data) : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): RenderResult {
    return new RenderResult({
      frameNumber: typeof data.frameNumber === 'number' ? data.frameNumber : -1,
      backendId: typeof data.backendId === 'string' ? data.backendId : '',
      targetId: typeof data.targetId === 'string' ? data.targetId : '',
      renderedAt: typeof data.renderedAt === 'number' ? data.renderedAt : undefined,
      stats: data.stats !== undefined
        ? (data.stats as Record<string, unknown>)
        : undefined,
      data: data.data !== undefined
        ? (data.data as Record<string, unknown>)
        : undefined,
    });
  }
}
