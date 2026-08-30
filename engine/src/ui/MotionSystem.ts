export type MotionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface MotionTransition {
  property: string;
  durationMs: number;
  easing: MotionEasing;
  delayMs: number;
  reduceMotion: boolean;
}

export interface MotionPreset {
  id: string;
  durationMs: number;
  easing: MotionEasing;
  delayMs?: number;
}

export const MOTION_PRESETS: MotionPreset[] = [
  { id: 'instant', durationMs: 0, easing: 'linear' },
  { id: 'fast', durationMs: 120, easing: 'ease-out' },
  { id: 'normal', durationMs: 240, easing: 'ease-in-out' },
  { id: 'slow', durationMs: 400, easing: 'ease-in-out' },
];

export class MotionSystem {
  private reduceMotion = false;
  private durationMs = 240;
  private easing: MotionEasing = 'ease-in-out';
  private delayMs = 0;

  constructor(options: Partial<{ reduceMotion: boolean; durationMs: number; easing: MotionEasing; delayMs: number }> = {}) {
    this.validateOptions(options);
    this.reduceMotion = options.reduceMotion ?? false;
    this.durationMs = options.durationMs ?? 240;
    this.easing = options.easing ?? 'ease-in-out';
    this.delayMs = options.delayMs ?? 0;
  }

  static fromPreset(presetId: string, reduceMotion = false): MotionSystem {
    const preset = MOTION_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      throw new Error(`Motion preset "${presetId}" does not exist.`);
    }

    return new MotionSystem({
      reduceMotion,
      durationMs: preset.durationMs,
      easing: preset.easing,
      delayMs: preset.delayMs ?? 0,
    });
  }

  setReduceMotion(enabled: boolean): void {
    this.reduceMotion = enabled;
  }

  setDuration(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('Motion duration must be a non-negative finite number.');
    }
    this.durationMs = durationMs;
  }

  setEasing(easing: MotionEasing): void {
    this.validateEasing(easing);
    this.easing = easing;
  }

  setDelay(delayMs: number): void {
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new Error('Motion delay must be a non-negative finite number.');
    }
    this.delayMs = delayMs;
  }

  isMotionReduced(): boolean {
    return this.reduceMotion;
  }

  getDurationMs(): number {
    return this.reduceMotion ? 0 : this.durationMs;
  }

  getEasing(): MotionEasing {
    return this.easing;
  }

  getDelayMs(): number {
    return this.reduceMotion ? 0 : this.delayMs;
  }

  getTransition(property: string): MotionTransition {
    if (!property || property.trim() === '') {
      throw new Error('Motion transition property is required.');
    }

    return {
      property,
      durationMs: this.getDurationMs(),
      easing: this.easing,
      delayMs: this.getDelayMs(),
      reduceMotion: this.reduceMotion,
    };
  }

  listPresets(): MotionPreset[] {
    return MOTION_PRESETS.map((preset) => ({ ...preset }));
  }

  toJSON(): Record<string, unknown> {
    return {
      reduceMotion: this.reduceMotion,
      durationMs: this.durationMs,
      easing: this.easing,
      delayMs: this.delayMs,
    };
  }

  private validateEasing(easing: MotionEasing): void {
    if (!['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(easing)) {
      throw new Error(`Invalid motion easing "${easing}".`);
    }
  }

  private validateOptions(options: Partial<{ reduceMotion: boolean; durationMs: number; easing: MotionEasing; delayMs: number }>): void {
    if (!options || typeof options !== 'object') {
      throw new Error('Motion system options must be an object.');
    }

    if (options.durationMs !== undefined) {
      if (!Number.isFinite(options.durationMs) || options.durationMs < 0) {
        throw new Error('Motion duration must be a non-negative finite number.');
      }
    }

    if (options.delayMs !== undefined) {
      if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
        throw new Error('Motion delay must be a non-negative finite number.');
      }
    }

    if (options.easing !== undefined) {
      this.validateEasing(options.easing);
    }
  }
}
