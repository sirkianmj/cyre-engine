/**
 * AccessibilitySettings
 * ----------------------
 * Stores user accessibility preferences for the UI.
 * Supports font size scaling, high contrast, and colorblind mode.
 */

export interface AccessibilityOptions {
  /** Font size multiplier, 1.0 = normal */
  fontSizeScale: number;
  /** High contrast mode */
  highContrast: boolean;
  /** Colorblind mode */
  colorblindMode: boolean;
  /** Reduce motion */
  reduceMotion: boolean;
}

export class AccessibilitySettings {
  private settings: AccessibilityOptions;

  constructor(initial: Partial<AccessibilityOptions> = {}) {
    this.settings = {
      fontSizeScale: initial.fontSizeScale ?? 1.0,
      highContrast: initial.highContrast ?? false,
      colorblindMode: initial.colorblindMode ?? false,
      reduceMotion: initial.reduceMotion ?? false,
    };
    this.validate();
  }

  getSettings(): Readonly<AccessibilityOptions> {
    return { ...this.settings };
  }

  setFontSizeScale(scale: number): void {
    if (typeof scale !== 'number' || scale < 0.5 || scale > 2.0) {
      throw new Error('Font size scale must be between 0.5 and 2.0.');
    }
    this.settings.fontSizeScale = scale;
  }

  setHighContrast(enabled: boolean): void {
    this.settings.highContrast = enabled;
  }

  setColorblindMode(enabled: boolean): void {
    this.settings.colorblindMode = enabled;
  }

  setReduceMotion(enabled: boolean): void {
    this.settings.reduceMotion = enabled;
  }

  render(): Record<string, unknown> {
    return {
      type: 'accessibility',
      ...this.settings,
    };
  }

  private validate(): void {
    if (
      typeof this.settings.fontSizeScale !== 'number' ||
      this.settings.fontSizeScale < 0.5 ||
      this.settings.fontSizeScale > 2.0
    ) {
      throw new Error('Font size scale must be between 0.5 and 2.0.');
    }
  }
}
