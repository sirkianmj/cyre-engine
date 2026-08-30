import {
  AccessibilitySettings,
  type AccessibilityOptions,
} from './AccessibilitySettings.js';
import { MotionSystem } from './MotionSystem.js';

export type ScreenReaderPriority = 'polite' | 'assertive';

export interface ScreenReaderAnnouncement {
  id: string;
  message: string;
  priority: ScreenReaderPriority;
  timestamp: number;
  read: boolean;
}

export interface AccessibilityControllerOptions {
  accessibility?: Partial<AccessibilityOptions>;
  screenReaderEnabled?: boolean;
  keyboardNavigationEnabled?: boolean;
  motionSystem?: MotionSystem;
}

export class AccessibilityController {
  private readonly accessibility: AccessibilitySettings;
  private readonly motion: MotionSystem;
  private screenReaderEnabled: boolean;
  private keyboardNavigationEnabled: boolean;
  private readonly announcements: ScreenReaderAnnouncement[] = [];
  private announcementCounter = 0;

  constructor(options: AccessibilityControllerOptions = {}) {
    this.validateOptions(options);

    this.accessibility = new AccessibilitySettings(options.accessibility);
    this.motion = options.motionSystem ?? new MotionSystem();
    this.motion.setReduceMotion(this.accessibility.getSettings().reduceMotion);

    this.screenReaderEnabled = options.screenReaderEnabled ?? false;
    this.keyboardNavigationEnabled = options.keyboardNavigationEnabled ?? true;
  }

  getSettings(): Readonly<AccessibilityOptions> {
    return this.accessibility.getSettings();
  }

  getMotionSystem(): MotionSystem {
    return this.motion;
  }

  setFontSizeScale(scale: number): void {
    this.accessibility.setFontSizeScale(scale);
  }

  setHighContrast(enabled: boolean): void {
    this.accessibility.setHighContrast(enabled);
  }

  setColorblindMode(enabled: boolean): void {
    this.accessibility.setColorblindMode(enabled);
  }

  setReduceMotion(enabled: boolean): void {
    this.accessibility.setReduceMotion(enabled);
    this.motion.setReduceMotion(enabled);
  }

  isScreenReaderEnabled(): boolean {
    return this.screenReaderEnabled;
  }

  setScreenReaderEnabled(enabled: boolean): void {
    this.screenReaderEnabled = enabled;
  }

  isKeyboardNavigationEnabled(): boolean {
    return this.keyboardNavigationEnabled;
  }

  setKeyboardNavigationEnabled(enabled: boolean): void {
    this.keyboardNavigationEnabled = enabled;
  }

  announceScreenReader(
    message: string,
    priority: ScreenReaderPriority = 'polite',
    timestamp: number = Date.now(),
  ): string {
    if (!message || message.trim() === '') {
      throw new Error('Screen reader announcement message is required.');
    }
    if (!['polite', 'assertive'].includes(priority)) {
      throw new Error(`Invalid screen reader priority "${priority}".`);
    }
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw new Error('Screen reader announcement timestamp must be a non-negative finite number.');
    }

    const id = `announcement-${++this.announcementCounter}`;
    this.announcements.push({
      id,
      message,
      priority,
      timestamp,
      read: false,
    });
    return id;
  }

  listAnnouncements(): ScreenReaderAnnouncement[] {
    return this.announcements.map((announcement) => ({ ...announcement }));
  }

  markAnnouncementRead(announcementId: string): void {
    const announcement = this.announcements.find((entry) => entry.id === announcementId);
    if (!announcement) {
      throw new Error(`Screen reader announcement "${announcementId}" does not exist.`);
    }
    announcement.read = true;
  }

  getUnreadAnnouncements(): ScreenReaderAnnouncement[] {
    return this.announcements
      .filter((announcement) => !announcement.read)
      .map((announcement) => ({ ...announcement }));
  }

  clearAnnouncements(): void {
    this.announcements.length = 0;
  }

  getColorSafePalette(): Record<'danger' | 'warning' | 'success' | 'info' | 'primary', string> {
    const colorblindMode = this.accessibility.getSettings().colorblindMode;

    if (colorblindMode) {
      return {
        primary: '#0072B2',
        success: '#56B4E9',
        warning: '#F0E442',
        danger: '#D55E00',
        info: '#009E73',
      };
    }

    return {
      primary: '#22d3ee',
      success: '#22c55e',
      warning: '#f97316',
      danger: '#ef4444',
      info: '#3b82f6',
    };
  }

  render(): Record<string, unknown> {
    return {
      type: 'accessibility-controller',
      settings: this.accessibility.getSettings(),
      motion: this.motion.toJSON(),
      screenReaderEnabled: this.screenReaderEnabled,
      keyboardNavigationEnabled: this.keyboardNavigationEnabled,
      unreadAnnouncements: this.getUnreadAnnouncements(),
      colorSafePalette: this.getColorSafePalette(),
    };
  }

  private validateOptions(options: AccessibilityControllerOptions): void {
    if (!options || typeof options !== 'object') {
      throw new Error('Accessibility controller options must be an object.');
    }
  }
}
