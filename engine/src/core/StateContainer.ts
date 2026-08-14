/**
 * StateContainer
 * ---------------
 * A simple observable state container.
 * Changes to state are published through an EventBus as 'state:change' events.
 */

import { EventBus, type BaseEvent } from './EventBus.js';

export interface StateChangeEvent extends BaseEvent {
  type: 'state:change';
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export class StateContainer<T extends Record<string, unknown> = Record<string, unknown>> {
  private state: T;
  private bus: EventBus;

  constructor(initialState: T, bus: EventBus) {
    this.state = { ...initialState };
    this.bus = bus;
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  getAll(): Readonly<T> {
    return { ...this.state };
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    const oldValue = this.state[key];
    if (oldValue === value) {
      return;
    }
    this.state[key] = value;
    this.bus.publish<StateChangeEvent>({
      type: 'state:change',
      timestamp: Date.now(),
      key: String(key),
      oldValue,
      newValue: value,
    });
  }

  update(patch: Partial<T>): void {
    for (const key in patch) {
      this.set(key as keyof T, patch[key] as T[keyof T]);
    }
  }
}
