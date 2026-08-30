import { describe, it, expect } from 'vitest';
import { PlayModeController } from '../PlayModeController.js';

function createClock(start = 0): { current: number; now(): number } {
  return {
    current: start,
    now() {
      return this.current;
    },
  };
}

describe('PlayModeController', () => {
  it('starts in stopped state with default speed', () => {
    const controller = new PlayModeController();
    expect(controller.getState()).toBe('stopped');
    expect(controller.getSpeed()).toBe(1);
    expect(controller.getElapsedTimeMs()).toBe(0);
  });

  it('loads a predefined mission', () => {
    const controller = new PlayModeController();
    controller.loadMission('mission-001');
    expect(controller.getState()).toBe('stopped');
    expect(controller.getMissionRunner()).toBeDefined();
  });

  it('throws when loading an unknown mission', () => {
    const controller = new PlayModeController();
    expect(() => controller.loadMission('missing-mission')).toThrow(/not registered/);
  });

  it('throws when starting without a loaded mission', () => {
    const controller = new PlayModeController();
    expect(() => controller.start()).toThrow(/No mission or scenario loaded/);
  });

  it('starts, pauses, resumes, and stops', () => {
    const clock = createClock(0);
    const controller = new PlayModeController(clock);
    controller.loadMission('mission-001');

    controller.start();
    expect(controller.getState()).toBe('running');

    clock.current = 1_000;
    controller.pause();
    expect(controller.getState()).toBe('paused');
    expect(controller.getElapsedTimeMs()).toBe(1_000);

    clock.current = 2_000;
    controller.resume();
    clock.current = 3_000;
    expect(controller.getElapsedTimeMs()).toBe(2_000);

    controller.stop();
    expect(controller.getState()).toBe('stopped');
  });

  it('throws when pausing while not running', () => {
    const controller = new PlayModeController();
    controller.loadMission('mission-001');
    expect(() => controller.pause()).toThrow(/only be paused while running/);
  });

  it('throws when resuming while not paused', () => {
    const controller = new PlayModeController();
    controller.loadMission('mission-001');
    expect(() => controller.resume()).toThrow(/only be resumed while paused/);
  });

  it('does not change state when calling stop on a stopped controller', () => {
    const clock = createClock(0);
    const controller = new PlayModeController(clock);
    controller.loadMission('mission-001');
    controller.stop();
    expect(controller.getState()).toBe('stopped');
    expect(controller.getElapsedTimeMs()).toBe(0);
  });

  it('validates speed settings', () => {
    const controller = new PlayModeController();
    controller.setSpeed(2.5);
    expect(controller.getSpeed()).toBe(2.5);

    expect(() => controller.setSpeed(0)).toThrow(/positive finite number/);
    expect(() => controller.setSpeed(-1)).toThrow(/positive finite number/);
  });

  it('steps through an initial alert when paused or stopped', () => {
    const controller = new PlayModeController();
    controller.loadMission('mission-001');
    expect(controller.step()).toBe(true);

    const secondStep = controller.step();
    expect(secondStep).toBe(false);
  });

  it('throws when stepping while running', () => {
    const controller = new PlayModeController();
    controller.loadMission('mission-001');
    controller.start();
    expect(() => controller.step()).toThrow(/paused or stopped to step/);
    controller.stop();
  });

  it('resets runtime state when loading another mission', () => {
    const clock = createClock(0);
    const controller = new PlayModeController(clock);
    controller.loadMission('mission-001');
    controller.setSpeed(3);
    controller.start();
    clock.current = 500;
    controller.pause();
    expect(controller.getElapsedTimeMs()).toBe(500);

    controller.loadMission('mission-002');
    expect(controller.getState()).toBe('stopped');
    expect(controller.getSpeed()).toBe(1);
    expect(controller.getElapsedTimeMs()).toBe(0);
  });

  it('rejects an invalid clock', () => {
    expect(() => new PlayModeController({} as any)).toThrow(/must expose a now/);
  });
});
