import {
  isVisualIntensity,
  isVisualMotionPreset,
  type VisualIntensity,
  type VisualMotionPreset,
} from './VisualPolishTypes.js';

export interface VisualPolishProfileOptions {
  id: string;
  name: string;
  themeId?: string;
  motionPreset?: VisualMotionPreset;
  reduceMotion?: boolean;
  visualIntensity?: VisualIntensity;
  colorblindSafe?: boolean;
  highContrast?: boolean;
  metadata?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class VisualPolishProfile {
  readonly id: string;
  readonly name: string;
  readonly themeId: string;
  readonly motionPreset: VisualMotionPreset;
  readonly reduceMotion: boolean;
  readonly visualIntensity: VisualIntensity;
  readonly colorblindSafe: boolean;
  readonly highContrast: boolean;
  readonly metadata?: Record<string, unknown>;

  constructor(options: VisualPolishProfileOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('VisualPolishProfile id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('VisualPolishProfile name is required.');
    }
    if (options.themeId !== undefined && options.themeId.trim() === '') {
      throw new Error('VisualPolishProfile themeId cannot be empty if provided.');
    }
    if (
      options.motionPreset !== undefined &&
      !isVisualMotionPreset(options.motionPreset)
    ) {
      throw new Error(`Invalid visual motion preset "${options.motionPreset}".`);
    }
    if (
      options.visualIntensity !== undefined &&
      !isVisualIntensity(options.visualIntensity)
    ) {
      throw new Error(`Invalid visual intensity "${options.visualIntensity}".`);
    }
    if (options.metadata !== undefined && !isRecord(options.metadata)) {
      throw new Error('VisualPolishProfile metadata must be an object if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.themeId = options.themeId ?? 'cyre-dark';
    this.motionPreset = options.motionPreset ?? 'normal';
    this.reduceMotion = options.reduceMotion ?? false;
    this.visualIntensity = options.visualIntensity ?? 'balanced';
    this.colorblindSafe = options.colorblindSafe ?? false;
    this.highContrast = options.highContrast ?? false;
    this.metadata = options.metadata !== undefined
      ? deepClone(options.metadata)
      : undefined;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('VisualPolishProfile id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('VisualPolishProfile name is required.');
    }
    if (!this.themeId || this.themeId.trim() === '') {
      throw new Error('VisualPolishProfile themeId is required.');
    }
    if (!isVisualMotionPreset(this.motionPreset)) {
      throw new Error(`Invalid visual motion preset "${this.motionPreset}".`);
    }
    if (!isVisualIntensity(this.visualIntensity)) {
      throw new Error(`Invalid visual intensity "${this.visualIntensity}".`);
    }
    if (typeof this.reduceMotion !== 'boolean') {
      throw new Error('VisualPolishProfile reduceMotion must be a boolean.');
    }
    if (typeof this.colorblindSafe !== 'boolean') {
      throw new Error('VisualPolishProfile colorblindSafe must be a boolean.');
    }
    if (typeof this.highContrast !== 'boolean') {
      throw new Error('VisualPolishProfile highContrast must be a boolean.');
    }
  }

  clone(): VisualPolishProfile {
    return VisualPolishProfile.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      themeId: this.themeId,
      motionPreset: this.motionPreset,
      reduceMotion: this.reduceMotion,
      visualIntensity: this.visualIntensity,
      colorblindSafe: this.colorblindSafe,
      highContrast: this.highContrast,
      metadata: this.metadata !== undefined ? deepClone(this.metadata) : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): VisualPolishProfile {
    if (!isRecord(data)) {
      throw new Error('VisualPolishProfile JSON data must be an object.');
    }

    return new VisualPolishProfile({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      themeId: typeof data.themeId === 'string' ? data.themeId : undefined,
      motionPreset: typeof data.motionPreset === 'string'
        ? (data.motionPreset as VisualMotionPreset)
        : undefined,
      reduceMotion: typeof data.reduceMotion === 'boolean'
        ? data.reduceMotion
        : undefined,
      visualIntensity: typeof data.visualIntensity === 'string'
        ? (data.visualIntensity as VisualIntensity)
        : undefined,
      colorblindSafe: typeof data.colorblindSafe === 'boolean'
        ? data.colorblindSafe
        : undefined,
      highContrast: typeof data.highContrast === 'boolean'
        ? data.highContrast
        : undefined,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
    });
  }

  static createDefaultSocPolish(): VisualPolishProfile {
    return new VisualPolishProfile({
      id: 'soc-command-polish',
      name: 'SOC Command Visual Polish',
      themeId: 'cyre-dark',
      motionPreset: 'fast',
      reduceMotion: false,
      visualIntensity: 'balanced',
      colorblindSafe: true,
      highContrast: false,
      metadata: {
        purpose: 'flagship-game',
        accessibilityPriority: 'high',
      },
    });
  }
}
