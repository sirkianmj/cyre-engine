import {
  isAudioClipKind,
  type AudioClipKind,
} from './AudioTypes.js';

export interface AudioClipDescriptorOptions {
  id: string;
  name: string;
  kind: AudioClipKind;
  uri?: string;
  durationMs?: number;
  looped?: boolean;
  metadata?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class AudioClipDescriptor {
  readonly id: string;
  readonly name: string;
  readonly kind: AudioClipKind;
  readonly uri?: string;
  readonly durationMs?: number;
  readonly looped: boolean;
  readonly metadata?: Record<string, unknown>;

  constructor(options: AudioClipDescriptorOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Audio clip id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Audio clip name is required.');
    }
    if (!isAudioClipKind(options.kind)) {
      throw new Error(`Invalid audio clip kind "${options.kind}".`);
    }
    if (options.uri !== undefined && options.uri.trim() === '') {
      throw new Error('Audio clip uri cannot be empty if provided.');
    }
    if (
      options.durationMs !== undefined &&
      (!Number.isFinite(options.durationMs) || options.durationMs < 0)
    ) {
      throw new Error('Audio clip durationMs must be a non-negative finite number.');
    }
    if (options.metadata !== undefined && !isRecord(options.metadata)) {
      throw new Error('Audio clip metadata must be an object if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.kind = options.kind;
    this.uri = options.uri;
    this.durationMs = options.durationMs;
    this.looped = options.looped ?? false;
    this.metadata = options.metadata !== undefined ? deepClone(options.metadata) : undefined;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Audio clip id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('Audio clip name is required.');
    }
    if (!isAudioClipKind(this.kind)) {
      throw new Error(`Invalid audio clip kind "${this.kind}".`);
    }
    if (this.uri !== undefined && this.uri.trim() === '') {
      throw new Error('Audio clip uri cannot be empty if provided.');
    }
  }

  clone(): AudioClipDescriptor {
    return AudioClipDescriptor.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      uri: this.uri,
      durationMs: this.durationMs,
      looped: this.looped,
      metadata: this.metadata !== undefined ? deepClone(this.metadata) : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): AudioClipDescriptor {
    if (!isRecord(data)) {
      throw new Error('Audio clip JSON data must be an object.');
    }

    return new AudioClipDescriptor({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      kind: typeof data.kind === 'string'
        ? (data.kind as AudioClipKind)
        : 'music',
      uri: typeof data.uri === 'string' ? data.uri : undefined,
      durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
      looped: typeof data.looped === 'boolean' ? data.looped : false,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
    });
  }
}
