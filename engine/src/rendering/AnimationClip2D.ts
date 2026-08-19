export interface AnimationFrame2D {
  time: number;
  value: Record<string, unknown>;
}

export interface AnimationClip2DOptions {
  id: string;
  name: string;
  duration: number;
  loop?: boolean;
  frames?: AnimationFrame2D[];
}

export class AnimationClip2D {
  readonly id: string;
  readonly name: string;
  readonly duration: number;
  readonly loop: boolean;
  readonly frames: readonly AnimationFrame2D[];

  constructor(options: AnimationClip2DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('AnimationClip2D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('AnimationClip2D name is required.');
    }
    if (!Number.isFinite(options.duration) || options.duration <= 0) {
      throw new Error('AnimationClip2D duration must be a positive finite number.');
    }

    const frames = options.frames ?? [];
    if (!Array.isArray(frames)) {
      throw new Error('AnimationClip2D frames must be an array.');
    }

    for (const frame of frames) {
      if (!Number.isFinite(frame.time) || frame.time < 0 || frame.time > options.duration) {
        throw new Error('AnimationClip2D frame time must be between 0 and duration.');
      }
      if (typeof frame.value !== 'object' || frame.value === null) {
        throw new Error('AnimationClip2D frame value must be an object.');
      }
    }

    this.id = options.id;
    this.name = options.name;
    this.duration = options.duration;
    this.loop = options.loop ?? false;
    this.frames = frames.map((frame) => ({
      time: frame.time,
      value: JSON.parse(JSON.stringify(frame.value)),
    }));
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): AnimationClip2D {
    return AnimationClip2D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      duration: this.duration,
      loop: this.loop,
      frames: this.frames.map((frame) => ({
        time: frame.time,
        value: JSON.parse(JSON.stringify(frame.value)),
      })),
    };
  }

  static fromJSON(data: Record<string, unknown>): AnimationClip2D {
    const frames = Array.isArray(data.frames)
      ? (data.frames as AnimationFrame2D[]).map((frame) => ({
          time: typeof frame.time === 'number' ? frame.time : 0,
          value: frame.value as Record<string, unknown>,
        }))
      : [];

    return new AnimationClip2D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      duration: typeof data.duration === 'number' ? data.duration : 0,
      loop: typeof data.loop === 'boolean' ? data.loop : false,
      frames,
    });
  }
}
