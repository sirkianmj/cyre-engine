import { describe, it, expect } from 'vitest';
import { AccessibilitySettings } from '../AccessibilitySettings.js';
import { FeedbackSystem } from '../FeedbackSystem.js';
import { OnboardingManager } from '../OnboardingManager.js';

describe('AccessibilitySettings', () => {
  it('defaults to normal settings', () => {
    const a11y = new AccessibilitySettings();
    expect(a11y.getSettings().fontSizeScale).toBe(1.0);
    expect(a11y.getSettings().highContrast).toBe(false);
    expect(a11y.getSettings().colorblindMode).toBe(false);
    expect(a11y.getSettings().reduceMotion).toBe(false);
  });

  it('updates font size scale', () => {
    const a11y = new AccessibilitySettings();
    a11y.setFontSizeScale(1.5);
    expect(a11y.getSettings().fontSizeScale).toBe(1.5);
  });

  it('throws on invalid font size scale', () => {
    const a11y = new AccessibilitySettings();
    expect(() => a11y.setFontSizeScale(3.0)).toThrow(/between 0.5 and 2.0/);
  });

  it('renders settings', () => {
    const a11y = new AccessibilitySettings({ highContrast: true });
    const render = a11y.render();
    expect(render.type).toBe('accessibility');
    expect(render.highContrast).toBe(true);
  });
});

describe('FeedbackSystem', () => {
  it('adds feedback messages', () => {
    const feedback = new FeedbackSystem();
    const id = feedback.add('success', 'Incident contained');
    expect(id).toBeDefined();
    expect(feedback.getAll()).toHaveLength(1);
    expect(feedback.getUnread()).toHaveLength(1);
  });

  it('marks messages as read', () => {
    const feedback = new FeedbackSystem();
    const id = feedback.add('info', 'Investigation started');
    feedback.markRead(id);
    expect(feedback.getUnread()).toHaveLength(0);
    expect(feedback.getAll()[0].read).toBe(true);
  });

  it('throws on invalid feedback type', () => {
    const feedback = new FeedbackSystem();
    expect(() => feedback.add('bad' as any, 'test')).toThrow(/Invalid feedback type/);
  });

  it('throws on empty text', () => {
    const feedback = new FeedbackSystem();
    expect(() => feedback.add('info', '')).toThrow(/non-empty/);
  });

  it('clears all feedback', () => {
    const feedback = new FeedbackSystem();
    feedback.add('warning', 'be careful');
    feedback.clear();
    expect(feedback.getAll()).toEqual([]);
  });
});

describe('OnboardingManager', () => {
  const steps = [
    { id: 'step1', title: 'Welcome', content: 'Welcome to CYRE' },
    { id: 'step2', title: 'Objective', content: 'Investigate the incident' },
  ];

  it('starts at first step', () => {
    const onboarding = new OnboardingManager(steps);
    expect(onboarding.getCurrentStep()!.id).toBe('step1');
    expect(onboarding.isComplete()).toBe(false);
  });

  it('completes steps in order', () => {
    const onboarding = new OnboardingManager(steps);
    onboarding.completeCurrentStep();
    expect(onboarding.getCurrentStep()!.id).toBe('step2');
    onboarding.completeCurrentStep();
    expect(onboarding.getCurrentStep()).toBeNull();
    expect(onboarding.isComplete()).toBe(true);
  });

  it('skips steps', () => {
    const onboarding = new OnboardingManager(steps);
    onboarding.skipCurrentStep();
    expect(onboarding.getCurrentStep()!.id).toBe('step2');
    onboarding.skipCurrentStep();
    expect(onboarding.getCurrentStep()).toBeNull();
  });

  it('throws on empty steps', () => {
    expect(() => new OnboardingManager([])).toThrow(/non-empty array/);
  });

  it('renders progress', () => {
    const onboarding = new OnboardingManager(steps);
    onboarding.completeCurrentStep();
    const render = onboarding.render();
    expect(render.type).toBe('onboarding');
    expect(render.progress.currentIndex).toBe(1);
    expect(render.progress.total).toBe(2);
  });
});
