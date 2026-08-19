export interface RenderRequestOptions {
  id: string;
  targetId: string;
  sceneGraphId?: string;
  options?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class RenderRequest {
  readonly id: string;
  readonly targetId: string;
  readonly sceneGraphId?: string;
  readonly options?: Record<string, unknown>;

  constructor(options: RenderRequestOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('RenderRequest id is required.');
    }
    if (!options.targetId || options.targetId.trim() === '') {
      throw new Error('RenderRequest targetId is required.');
    }
    if (
      options.sceneGraphId !== undefined &&
      options.sceneGraphId.trim() === ''
    ) {
      throw new Error('RenderRequest sceneGraphId cannot be empty if provided.');
    }

    this.id = options.id;
    this.targetId = options.targetId;
    this.sceneGraphId = options.sceneGraphId;
    this.options = options.options !== undefined
      ? deepClone(options.options)
      : undefined;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('RenderRequest id is required.');
    }
    if (!this.targetId || this.targetId.trim() === '') {
      throw new Error('RenderRequest targetId is required.');
    }
    if (
      this.sceneGraphId !== undefined &&
      this.sceneGraphId.trim() === ''
    ) {
      throw new Error('RenderRequest sceneGraphId cannot be empty if provided.');
    }
  }

  clone(): RenderRequest {
    return RenderRequest.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      targetId: this.targetId,
      sceneGraphId: this.sceneGraphId,
      options: this.options !== undefined ? deepClone(this.options) : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): RenderRequest {
    return new RenderRequest({
      id: typeof data.id === 'string' ? data.id : '',
      targetId: typeof data.targetId === 'string' ? data.targetId : '',
      sceneGraphId: typeof data.sceneGraphId === 'string'
        ? data.sceneGraphId
        : undefined,
      options: data.options !== undefined
        ? (data.options as Record<string, unknown>)
        : undefined,
    });
  }
}
