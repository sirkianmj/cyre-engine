/**
 * ResolutionSettings
 * --------------------
 * Manages resolution independence and scaling.
 */

export interface ResolutionInfo {
  width: number;
  height: number;
  scaleFactor: number;
}

export class ResolutionSettings {
  private width: number;
  private height: number;
  private scaleFactor: number;

  constructor(options: { width: number; height: number; scaleFactor?: number } = { width: 1920, height: 1080, scaleFactor: 1 }) {
    if (options.width <= 0 || options.height <= 0) {
      throw new Error('Width and height must be positive.');
    }
    if (options.scaleFactor !== undefined && options.scaleFactor <= 0) {
      throw new Error('Scale factor must be positive.');
    }
    this.width = options.width;
    this.height = options.height;
    this.scaleFactor = options.scaleFactor ?? 1;
  }

  setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new Error('Width and height must be positive.');
    }
    this.width = width;
    this.height = height;
  }

  setScaleFactor(scaleFactor: number): void {
    if (scaleFactor <= 0) {
      throw new Error('Scale factor must be positive.');
    }
    this.scaleFactor = scaleFactor;
  }

  getInfo(): ResolutionInfo {
    return {
      width: this.width,
      height: this.height,
      scaleFactor: this.scaleFactor,
    };
  }

  render(): Record<string, unknown> {
    return {
      type: 'resolution',
      ...this.getInfo(),
    };
  }
}
