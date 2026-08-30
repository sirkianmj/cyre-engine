import { MissionFactory } from './MissionFactory.js';
import { MissionRunner } from './MissionRunner.js';
import { AlertStatus } from './AlertStatus.js';
import type { ScenarioDefinition } from '../scenario/index.js';

export type PlayModeState =
  | 'stopped'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

export interface PlayModeClock {
  now(): number;
}

export class PlayModeController {
  private runner?: MissionRunner;
  private state: PlayModeState = 'stopped';
  private speed = 1;
  private elapsedMs = 0;
  private lastResumeAt?: number;
  private readonly clock: PlayModeClock;

  constructor(clock: PlayModeClock = { now: () => Date.now() }) {
    if (!clock || typeof clock.now !== 'function') {
      throw new Error('Play mode clock must expose a now() function.');
    }
    this.clock = clock;
  }

  loadMission(missionId: string): void {
    if (!missionId || missionId.trim() === '') {
      throw new Error('Mission id is required.');
    }
    if (!MissionFactory.has(missionId)) {
      throw new Error(`Mission "${missionId}" is not registered.`);
    }

    const scenario = MissionFactory.create(missionId);
    this.runner = new MissionRunner(scenario);
    this.resetRuntimeState();
  }

  loadScenario(scenario: ScenarioDefinition): void {
    if (!scenario) {
      throw new Error('Scenario definition is required.');
    }

    this.runner = new MissionRunner(scenario);
    this.resetRuntimeState();
  }

  start(): void {
    const runner = this.getLoadedRunner();
    if (this.state === 'running') {
      throw new Error('Play mode is already running.');
    }

    runner.start();
    this.state = 'running';
    this.lastResumeAt = this.clock.now();
  }

  pause(): void {
    this.getLoadedRunner();
    if (this.state !== 'running') {
      throw new Error('Play mode can only be paused while running.');
    }

    this.accumulateElapsed();
    this.state = 'paused';
    this.lastResumeAt = undefined;
  }

  resume(): void {
    this.getLoadedRunner();
    if (this.state !== 'paused') {
      throw new Error('Play mode can only be resumed while paused.');
    }

    this.state = 'running';
    this.lastResumeAt = this.clock.now();
  }

  step(): boolean {
    const runner = this.getLoadedRunner();
    if (this.state === 'running') {
      throw new Error('Play mode must be paused or stopped to step.');
    }

    const newAlert = runner.investigation
      .getAlerts()
      .find((alert) => alert.getStatus() === AlertStatus.New);

    if (!newAlert) {
      return false;
    }

    runner.investigation.acknowledgeAlert(newAlert.id);
    return true;
  }

  stop(): void {
    this.getLoadedRunner();
    if (this.state === 'stopped') {
      return;
    }

    if (this.state === 'running') {
      this.accumulateElapsed();
    }

    this.state = 'stopped';
    this.lastResumeAt = undefined;
  }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0) {
      throw new Error('Play mode speed must be a positive finite number.');
    }
    this.speed = speed;
  }

  getSpeed(): number {
    return this.speed;
  }

  getState(): PlayModeState {
    return this.state;
  }

  getElapsedTimeMs(): number {
    if (this.state === 'running' && this.lastResumeAt !== undefined) {
      return this.elapsedMs + Math.max(0, this.clock.now() - this.lastResumeAt);
    }
    return this.elapsedMs;
  }

  getMissionRunner(): MissionRunner {
    return this.getLoadedRunner();
  }

  private getLoadedRunner(): MissionRunner {
    if (!this.runner) {
      throw new Error('No mission or scenario loaded.');
    }
    return this.runner;
  }

  private resetRuntimeState(): void {
    this.state = 'stopped';
    this.speed = 1;
    this.elapsedMs = 0;
    this.lastResumeAt = undefined;
  }

  private accumulateElapsed(): void {
    if (this.lastResumeAt !== undefined) {
      this.elapsedMs += Math.max(0, this.clock.now() - this.lastResumeAt);
    }
  }
}
