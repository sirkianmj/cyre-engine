export interface SimulationClock {
  now(): number;
  advance?(ms: number): void;
}

export class SystemSimulationClock implements SimulationClock {
  now(): number {
    return Date.now();
  }
}

export class ManualSimulationClock implements SimulationClock {
  private current: number;

  constructor(startTime = 0) {
    if (!Number.isFinite(startTime) || startTime < 0) {
      throw new Error('ManualSimulationClock startTime must be a non-negative finite number.');
    }
    this.current = startTime;
  }

  now(): number {
    return this.current;
  }

  advance(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new Error('ManualSimulationClock advance must be a non-negative finite number.');
    }
    this.current += ms;
  }

  set(time: number): void {
    if (!Number.isFinite(time) || time < 0) {
      throw new Error('ManualSimulationClock set must be a non-negative finite number.');
    }
    this.current = time;
  }
}
