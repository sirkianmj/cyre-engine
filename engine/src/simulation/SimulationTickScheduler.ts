export interface ScheduledSimulationAction<TState> {
  id: string;
  dueTime: number;
  type: string;
  run: (state: TState) => TState | void;
}

export class SimulationTickScheduler<TState> {
  private queue: Array<ScheduledSimulationAction<TState>> = [];

  schedule(action: ScheduledSimulationAction<TState>): void {
    if (!action.id || action.id.trim() === '') {
      throw new Error('Scheduled simulation action id is required.');
    }
    if (!action.type || action.type.trim() === '') {
      throw new Error('Scheduled simulation action type is required.');
    }
    if (!Number.isFinite(action.dueTime) || action.dueTime < 0) {
      throw new Error('Scheduled simulation action dueTime must be a non-negative finite number.');
    }
    if (typeof action.run !== 'function') {
      throw new Error('Scheduled simulation action run must be a function.');
    }

    this.queue.push(action);
    this.queue.sort((a, b) => a.dueTime - b.dueTime || a.id.localeCompare(b.id));
  }

  getNextDueTime(): number | undefined {
    return this.queue[0]?.dueTime;
  }

  processDue(now: number): Array<ScheduledSimulationAction<TState>> {
    const due: Array<ScheduledSimulationAction<TState>> = [];

    while (this.queue.length > 0 && this.queue[0].dueTime <= now) {
      due.push(this.queue.shift()!);
    }

    return due;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.length = 0;
  }
}
