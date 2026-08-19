import type { RenderingMode } from './RenderTarget.js';

export interface RenderingCapabilitiesOptions {
  modes: RenderingMode[];
  features?: string[];
  maxResolution?: {
    width: number;
    height: number;
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class RenderingCapabilities {
  readonly modes: readonly RenderingMode[];
  readonly features: readonly string[];
  readonly maxResolution?: {
    readonly width: number;
    readonly height: number;
  };

  constructor(options: RenderingCapabilitiesOptions) {
    if (!Array.isArray(options.modes) || options.modes.length === 0) {
      throw new Error('RenderingCapabilities requires at least one mode.');
    }
    const uniqueModes = new Set<RenderingMode>();
    for (const mode of options.modes) {
      if (!['2d', '2.5d', '3d', 'headless'].includes(mode)) {
        throw new Error(`Invalid rendering mode "${mode}".`);
      }
      if (uniqueModes.has(mode)) {
        throw new Error(`Duplicate rendering mode "${mode}".`);
      }
      uniqueModes.add(mode);
    }

    if (options.features !== undefined) {
      if (!Array.isArray(options.features)) {
        throw new Error('RenderingCapabilities features must be an array.');
      }
      for (const feature of options.features) {
        if (typeof feature !== 'string' || feature.trim() === '') {
          throw new Error('RenderingCapabilities features must be non-empty strings.');
        }
      }
    }

    if (options.maxResolution !== undefined) {
      const { width, height } = options.maxResolution;
      if (!Number.isFinite(width) || width <= 0) {
        throw new Error('maxResolution width must be positive.');
      }
      if (!Number.isFinite(height) || height <= 0) {
        throw new Error('maxResolution height must be positive.');
      }
    }

    this.modes = Object.freeze([...options.modes]);
    this.features = Object.freeze(options.features ? [...options.features] : []);
    this.maxResolution = options.maxResolution
      ? Object.freeze({ ...options.maxResolution })
      : undefined;
  }

  hasMode(mode: RenderingMode): boolean {
    return this.modes.includes(mode);
  }

  hasFeature(feature: string): boolean {
    return this.features.includes(feature);
  }

  clone(): RenderingCapabilities {
    return RenderingCapabilities.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      modes: [...this.modes],
      features: [...this.features],
      maxResolution: this.maxResolution
        ? { ...this.maxResolution }
        : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): RenderingCapabilities {
    return new RenderingCapabilities({
      modes: Array.isArray(data.modes)
        ? (data.modes as RenderingMode[])
        : [],
      features: Array.isArray(data.features)
        ? (data.features as string[])
        : undefined,
      maxResolution: data.maxResolution !== undefined
        ? (data.maxResolution as { width: number; height: number })
        : undefined,
    });
  }
}
