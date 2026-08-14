/**
 * EventBus
 * --------
 * A lightweight event system supporting subscriptions and history.
 * Events are timestamped and can carry arbitrary data.
 */

export interface BaseEvent {
  type: string;
  timestamp: number;
  source?: string;
  data?: unknown;
}

export type EventHandler<E extends BaseEvent = BaseEvent> = (event: E) => void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler<BaseEvent>>> = new Map();
  private history: BaseEvent[] = [];

  /**
   * Subscribe to events of a specific type.
   * Returns an unsubscribe function.
   */
  subscribe<E extends BaseEvent = BaseEvent>(
    type: string,
    handler: EventHandler<E>,
  ): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler<BaseEvent>);

    return () => {
      const currentSet = this.handlers.get(type);
      if (currentSet) {
        currentSet.delete(handler as EventHandler<BaseEvent>);
        if (currentSet.size === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  /**
   * Publish an event. All subscribers of the event type are notified.
   * The event is also recorded in history.
   */
  publish<E extends BaseEvent = BaseEvent>(event: E): void {
    this.history.push({ ...event });
    const set = this.handlers.get(event.type);
    if (set) {
      for (const handler of set) {
        handler(event);
      }
    }
  }

  /**
   * Get all events ever published (copy).
   */
  getHistory(): BaseEvent[] {
    return [...this.history];
  }

  /**
   * Clear event history.
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * Remove all subscriptions.
   */
  clearSubscriptions(): void {
    this.handlers.clear();
  }
}
