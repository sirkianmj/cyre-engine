import { MotionSystem } from './MotionSystem.js';
import {
  UIThemeManager,
  type UIThemeDefinition,
} from './UIThemeManager.js';
import {
  isVisualIntensity,
  isVisualMotionPreset,
  type VisualIntensity,
  type VisualMotionPreset,
} from './VisualPolishTypes.js';
import {
  VisualPolishProfile,
} from './VisualPolishProfile.js';

export interface VisualPolishMotionSnapshot {
  reduceMotion: boolean;
  durationMs: number;
  easing: string;
  delayMs: number;
  preset: VisualMotionPreset;
}

export interface VisualPolishSnapshot {
  profile: VisualPolishProfile;
  activeThemeId: string;
  activeTheme: UIThemeDefinition;
  motion: VisualPolishMotionSnapshot;
  visualIntensity: VisualIntensity;
  colorblindSafe: boolean;
  highContrast: boolean;
  summary: string;
}

export interface VisualPolishSystemOptions {
  profile?: VisualPolishProfile;
  themeManager?: UIThemeManager;
}

export class VisualPolishSystem {
  private profile: VisualPolishProfile;
  private readonly themeManager: UIThemeManager;
  private motionSystem: MotionSystem;

  constructor(options: VisualPolishSystemOptions = {}) {
    this.themeManager = options.themeManager ?? new UIThemeManager();
    this.profile = options.profile ?? VisualPolishProfile.createDefaultSocPolish();
    this.motionSystem = MotionSystem.fromPreset('normal', false);
    this.applyProfile(this.profile);
  }

  getProfile(): VisualPolishProfile {
    return this.profile.clone();
  }

  getThemeManager(): UIThemeManager {
    return this.themeManager;
  }

  getMotionSystem(): MotionSystem {
    return this.motionSystem;
  }

  applyProfile(profile: VisualPolishProfile): void {
    profile.validate();

    if (!this.themeManager.listThemes().some((theme) => theme.id === profile.themeId)) {
      throw new Error(`Visual polish theme "${profile.themeId}" does not exist.`);
    }
    if (!isVisualMotionPreset(profile.motionPreset)) {
      throw new Error(`Invalid visual motion preset "${profile.motionPreset}".`);
    }
    if (!isVisualIntensity(profile.visualIntensity)) {
      throw new Error(`Invalid visual intensity "${profile.visualIntensity}".`);
    }

    this.profile = profile.clone();
    this.themeManager.activateTheme(this.profile.themeId);
    this.motionSystem = MotionSystem.fromPreset(
      this.profile.motionPreset,
      this.profile.reduceMotion,
    );
  }

  getActiveTheme(): UIThemeDefinition {
    return this.themeManager.getActiveTheme();
  }

  getActiveThemeId(): string {
    return this.themeManager.getActiveThemeId();
  }

  getMotionSnapshot(): VisualPolishMotionSnapshot {
    return {
      reduceMotion: this.motionSystem.isMotionReduced(),
      durationMs: this.motionSystem.getDurationMs(),
      easing: this.motionSystem.getEasing(),
      delayMs: this.motionSystem.getDelayMs(),
      preset: this.profile.motionPreset,
    };
  }

  validate(): void {
    this.profile.validate();
    if (!this.themeManager.listThemes().some((theme) => theme.id === this.profile.themeId)) {
      throw new Error(`Visual polish theme "${this.profile.themeId}" does not exist.`);
    }
    this.motionSystem.toJSON();
  }

  createSnapshot(): VisualPolishSnapshot {
    const activeThemeId = this.themeManager.getActiveThemeId();
    const activeTheme = this.themeManager.getActiveTheme();
    const motion = this.getMotionSnapshot();

    return {
      profile: this.profile.clone(),
      activeThemeId,
      activeTheme,
      motion,
      visualIntensity: this.profile.visualIntensity,
      colorblindSafe: this.profile.colorblindSafe,
      highContrast: this.profile.highContrast,
      summary: [
        this.profile.name,
        `theme=${activeThemeId}`,
        `motion=${motion.durationMs}ms/${motion.easing}`,
        `intensity=${this.profile.visualIntensity}`,
        this.profile.reduceMotion ? 'reduced-motion' : 'full-motion',
        this.profile.colorblindSafe ? 'colorblind-safe' : 'standard-color',
        this.profile.highContrast ? 'high-contrast' : 'normal-contrast',
      ].join(' | '),
    };
  }

  render(): Record<string, unknown> {
    return {
      type: 'visual-polish',
      ...this.createSnapshot(),
    };
  }
}
