export type LiveEventType =
  | 'alert_acknowledged'
  | 'evidence_viewed'
  | 'hypothesis_formed'
  | 'containment_applied'
  | 'recovery_applied';

export interface LiveSimulationEvent {
  id: string;
  sequence: number;
  type: LiveEventType;
  timestamp: number;
  source?: string;
  data?: Record<string, unknown>;
}

export type LiveEventStreamListener = (event: LiveSimulationEvent) => void;

export interface LiveEventStreamClock {
  now(): number;
}

export interface LiveEventStreamOptions {
  maxHistory?: number;
  clock?: LiveEventStreamClock;
}

export class LiveEventStream {
  private readonly events: LiveSimulationEvent[] = [];
  private readonly listeners = new Set<LiveEventStreamListener>();
  private readonly clock: LiveEventStreamClock;
  private readonly maxHistory: number;
  private sequence = 0;

  constructor(options: LiveEventStreamOptions = {}) {
    const resolvedMaxHistory = options.maxHistory ?? 100;
    if (!Number.isInteger(resolvedMaxHistory) || resolvedMaxHistory <= 0) {
      throw new Error('Live event stream maxHistory must be a positive integer.');
    }

    const resolvedClock = options.clock ?? { now: () => Date.now() };
    if (!resolvedClock || typeof resolvedClock.now !== 'function') {
      throw new Error('Live event stream clock must expose a now() function.');
    }

    this.maxHistory = resolvedMaxHistory;
    this.clock = resolvedClock;
  }

  publish(
    type: LiveEventType,
    source?: string,
    data?: Record<string, unknown>,
  ): LiveSimulationEvent {
    this.validateType(type);
    this.validateSource(source);
    this.validateData(data);

    const event: LiveSimulationEvent = {
      id: `event-${++this.sequence}`,
      sequence: this.sequence,
      type,
      timestamp: this.clock.now(),
      source,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    };

    this.events.push(event);

    if (this.events.length > this.maxHistory) {
      this.events.splice(0, this.events.length - this.maxHistory);
    }

    for (const listener of this.listeners) {
      listener(this.copyEvent(event));
    }

    return this.copyEvent(event);
  }

  recordAlertAcknowledged(alertId: string, data?: Record<string, unknown>): LiveSimulationEvent {
    return this.publish('alert_acknowledged', alertId, data);
  }

  recordEvidenceViewed(evidenceId: string, data?: Record<string, unknown>): LiveSimulationEvent {
    return this.publish('evidence_viewed', evidenceId, data);
  }

  recordHypothesisFormed(hypothesisId: string, data?: Record<string, unknown>): LiveSimulationEvent {
    return this.publish('hypothesis_formed', hypothesisId, data);
  }

  recordContainmentApplied(targetId: string, data?: Record<string, unknown>): LiveSimulationEvent {
    return this.publish('containment_applied', targetId, data);
  }

  recordRecoveryApplied(targetId: string, data?: Record<string, unknown>): LiveSimulationEvent {
    return this.publish('recovery_applied', targetId, data);
  }

  subscribe(listener: LiveEventStreamListener): () => void {
    if (typeof listener !== 'function') {
      throw new Error('Live event stream listener must be a function.');
    }
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getEventCount(): number {
    return this.events.length;
  }

  listHistory(): LiveSimulationEvent[] {
    return this.events.map((event) => this.copyEvent(event));
  }

  getRecentEvents(limit: number): LiveSimulationEvent[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Live event stream recent limit must be a non-negative integer.');
    }

    return this.events
      .slice(Math.max(0, this.events.length - limit))
      .map((event) => this.copyEvent(event));
  }

  clear(): void {
    this.events.length = 0;
  }

  private validateType(type: LiveEventType): void {
    if (
      ![
        'alert_acknowledged',
        'evidence_viewed',
        'hypothesis_formed',
        'containment_applied',
        'recovery_applied',
      ].includes(type)
    ) {
      throw new Error(`Invalid live event type "${type}".`);
    }
  }

  private validateSource(source?: string): void {
    if (source !== undefined && source.trim() === '') {
      throw new Error('Live event source cannot be empty if provided.');
    }
  }

  private validateData(data?: Record<string, unknown>): void {
    if (data !== undefined && (data === null || typeof data !== 'object' || Array.isArray(data))) {
      throw new Error('Live event data must be an object if provided.');
    }
  }

  private copyEvent(event: LiveSimulationEvent): LiveSimulationEvent {
    return {
      id: event.id,
      sequence: event.sequence,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      data: event.data ? JSON.parse(JSON.stringify(event.data)) : undefined,
    };
  }
}
