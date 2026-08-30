import { describe, it, expect } from 'vitest';
import { AccessibilityController } from '../AccessibilityController.js';
import { MotionSystem } from '../MotionSystem.js';

describe('AccessibilityController', () => {
  it('creates with default settings', () => {
    const controller = new AccessibilityController();
    expect(controller.getSettings()).toEqual({
      fontSizeScale: 1,
      highContrast: false,
      colorblindMode: false,
      reduceMotion: false,
    });
    expect(controller.isScreenReaderEnabled()).toBe(false);
    expect(controller.isKeyboardNavigationEnabled()).toBe(true);
  });

  it('delegates font size settings', () => {
    const controller = new AccessibilityController();
    controller.setFontSizeScale(1.5);
    expect(controller.getSettings().fontSizeScale).toBe(1.5);
    expect(() => controller.setFontSizeScale(3)).toThrow(/between 0.5 and 2.0/);
  });

  it('synchronizes reduced motion with motion system', () => {
    const motion = new MotionSystem();
    const controller = new AccessibilityController({ motionSystem: motion });

    controller.setReduceMotion(true);
    expect(controller.getSettings().reduceMotion).toBe(true);
    expect(motion.isMotionReduced()).toBe(true);

    controller.setReduceMotion(false);
    expect(motion.isMotionReduced()).toBe(false);
  });

  it('announces screen reader messages and marks them read', () => {
    const controller = new AccessibilityController();
    const id = controller.announceScreenReader('Incident detected', 'assertive', 100);
    expect(controller.listAnnouncements()).toHaveLength(1);
    expect(controller.getUnreadAnnouncements()[0].priority).toBe('assertive');

    controller.markAnnouncementRead(id);
    expect(controller.getUnreadAnnouncements()).toHaveLength(0);
    expect(controller.listAnnouncements()[0].read).toBe(true);
  });

  it('rejects invalid announcements', () => {
    const controller = new AccessibilityController();
    expect(() => controller.announceScreenReader('   ')).toThrow(/message is required/);
    expect(() =>
      controller.announceScreenReader('Bad priority', 'invalid' as any),
    ).toThrow(/Invalid screen reader priority/);
    expect(() =>
      controller.announceScreenReader('Bad timestamp', 'polite', -1),
    ).toThrow(/non-negative finite number/);
  });

  it('throws when marking missing announcement read', () => {
    const controller = new AccessibilityController();
    expect(() => controller.markAnnouncementRead('missing')).toThrow(/does not exist/);
  });

  it('clears announcements', () => {
    const controller = new AccessibilityController();
    controller.announceScreenReader('One');
    controller.announceScreenReader('Two');
    controller.clearAnnouncements();
    expect(controller.listAnnouncements()).toHaveLength(0);
  });

  it('provides color-safe palette based on colorblind mode', () => {
    const controller = new AccessibilityController();
    const normal = controller.getColorSafePalette();
    expect(normal.primary).toBe('#22d3ee');

    controller.setColorblindMode(true);
    const colorblind = controller.getColorSafePalette();
    expect(colorblind.primary).toBe('#0072B2');
  });

  it('exposes screen reader and keyboard navigation state', () => {
    const controller = new AccessibilityController();
    controller.setScreenReaderEnabled(true);
    controller.setKeyboardNavigationEnabled(false);
    expect(controller.isScreenReaderEnabled()).toBe(true);
    expect(controller.isKeyboardNavigationEnabled()).toBe(false);
  });

  it('returns isolated announcements', () => {
    const controller = new AccessibilityController();
    controller.announceScreenReader('Original', 'polite', 10);
    const announcements = controller.listAnnouncements();
    announcements[0].message = 'Mutated';
    expect(controller.listAnnouncements()[0].message).toBe('Original');
  });

  it('renders a complete accessibility summary', () => {
    const controller = new AccessibilityController({ screenReaderEnabled: true });
    controller.setHighContrast(true);
    controller.announceScreenReader('Welcome');
    const rendered = controller.render();
    expect(rendered.type).toBe('accessibility-controller');
    expect(rendered.screenReaderEnabled).toBe(true);
    expect((rendered.settings as any).highContrast).toBe(true);
  });
});
