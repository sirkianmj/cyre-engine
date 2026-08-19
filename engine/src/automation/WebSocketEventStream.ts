import type { AutomationEvent } from './AutomationTypes.js';

export interface WebSocketLike {
  send(data: string): void;
  close?(code?: number, reason?: string): void;
}

export interface WebSocketEventEnvelope {
  id: string;
  sequence: number;
  type: string;
  timestamp: number;
  source?: string;
  data?: unknown;
}

export interface EventStreamFilter {
  types?: string[];
  sources?: string[];
  fromTimestamp?: number;
  toTimestamp?: number;
  includeHistory?: boolean;
}

export interface WebSocketEventStreamStats {
  emittedCount: number;
  deliveredCount: number;
  subscriberCount: number;
  attachedSocketCount: number;
  historySize: number;
  historyLimit: number;
}

export interface WebSocketEventStreamSnapshot {
  name: string;
  stats: WebSocketEventStreamStats;
  subscriberIds: string[];
  recentEvents: WebSocketEventEnvelope[];
  summary: string;
}

export interface WebSocketEventStreamOptions {
  name?: string;
  historyLimit?: number;
}

interface SubscriberEntry {
  id: string;
  filter: EventStreamFilter;
  listener: (envelope: WebSocketEventEnvelope) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export class WebSocketEventStream {
  readonly name: string;
  private readonly historyLimit: number;
  private readonly subscribers = new Map<string, SubscriberEntry>();
  private readonly attachedSockets = new Map<string, {
    socket: WebSocketLike;
    unsubscribe: () => void;
  }>();
  private readonly history: WebSocketEventEnvelope[] = [];
  private emittedCountValue = 0;
  private deliveredCountValue = 0;
  private nextSequence = 1;
  private nextSubscriberId = 1;
  private nextSocketId = 1;

  constructor(options: WebSocketEventStreamOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('WebSocketEventStream name cannot be empty if provided.');
    }
    if (
      options.historyLimit !== undefined &&
      (!Number.isInteger(options.historyLimit) || options.historyLimit < 1)
    ) {
      throw new Error('WebSocketEventStream historyLimit must be a positive integer.');
    }

    this.name = options.name ?? 'CYRE WebSocket Event Stream';
    this.historyLimit = options.historyLimit ?? 1000;
  }

  publish(event: AutomationEvent): WebSocketEventEnvelope {
    this.validateEvent(event);

    const envelope: WebSocketEventEnvelope = {
      id: this.createEnvelopeId(),
      sequence: this.nextSequence,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      data: event.data !== undefined ? deepClone(event.data) : undefined,
    };

    this.nextSequence += 1;
    this.emittedCountValue += 1;
    this.history.push(deepClone(envelope));
    this.trimHistory();

    for (const subscriber of this.subscribers.values()) {
      if (this.matchesFilter(envelope, subscriber.filter)) {
        subscriber.listener(deepClone(envelope));
        this.deliveredCountValue += 1;
      }
    }

    return deepClone(envelope);
  }

  emit(event: AutomationEvent): WebSocketEventEnvelope {
    return this.publish(event);
  }

  subscribe(
    listener: (envelope: WebSocketEventEnvelope) => void,
    filter: EventStreamFilter = {},
  ): () => void {
    if (typeof listener !== 'function') {
      throw new Error('WebSocketEventStream subscriber listener must be a function.');
    }
    this.validateFilter(filter);

    const subscriberId = this.createSubscriberId();
    const subscriber: SubscriberEntry = {
      id: subscriberId,
      filter: this.normalizeFilter(filter),
      listener,
    };

    this.subscribers.set(subscriberId, subscriber);

    if (subscriber.filter.includeHistory) {
      for (const event of this.history) {
        if (this.matchesFilter(event, subscriber.filter)) {
          listener(deepClone(event));
          this.deliveredCountValue += 1;
        }
      }
    }

    return () => {
      this.subscribers.delete(subscriberId);
    };
  }

  attachSocket(
    socket: WebSocketLike,
    filter: EventStreamFilter = {},
  ): () => void {
    if (!socket || typeof socket.send !== 'function') {
      throw new Error('WebSocketEventStream socket must expose a send() method.');
    }
    if (socket.close !== undefined && typeof socket.close !== 'function') {
      throw new Error('WebSocketEventStream socket close() must be a function if provided.');
    }

    this.validateFilter(filter);
    const socketId = this.createSocketId();
    const normalizedFilter = this.normalizeFilter(filter);

    const unsubscribe = this.subscribe((envelope) => {
      socket.send(JSON.stringify(envelope));
    }, normalizedFilter);

    this.attachedSockets.set(socketId, { socket, unsubscribe });

    return () => {
      this.attachedSockets.delete(socketId);
      unsubscribe();
    };
  }

  detachSocket(socketId: string): void {
    const entry = this.attachedSockets.get(socketId);
    if (!entry) {
      throw new Error(`Attached socket "${socketId}" does not exist.`);
    }
    entry.unsubscribe();
    this.attachedSockets.delete(socketId);
  }

  listSocketIds(): string[] {
    return Array.from(this.attachedSockets.keys()).sort();
  }

  getHistory(limit?: number): WebSocketEventEnvelope[] {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
      throw new Error('WebSocketEventStream history limit must be a non-negative integer.');
    }

    const history = this.history.map((event) => deepClone(event));
    return limit !== undefined ? history.slice(-limit) : history;
  }

  getRecentEvents(limit = 20): WebSocketEventEnvelope[] {
    return this.getHistory(limit);
  }

  getStats(): WebSocketEventStreamStats {
    return {
      emittedCount: this.emittedCountValue,
      deliveredCount: this.deliveredCountValue,
      subscriberCount: this.subscribers.size,
      attachedSocketCount: this.attachedSockets.size,
      historySize: this.history.length,
      historyLimit: this.historyLimit,
    };
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('WebSocketEventStream name is required.');
    }
    if (!Number.isInteger(this.historyLimit) || this.historyLimit < 1) {
      throw new Error('WebSocketEventStream historyLimit must be a positive integer.');
    }
    for (const event of this.history) {
      if (!event.id || !event.type || !Number.isFinite(event.timestamp)) {
        throw new Error('WebSocketEventStream contains an invalid history event.');
      }
    }
  }

  createSnapshot(): WebSocketEventStreamSnapshot {
    const stats = this.getStats();
    const recentEvents = this.getRecentEvents(20);

    return {
      name: this.name,
      stats,
      subscriberIds: Array.from(this.subscribers.keys()).sort(),
      recentEvents,
      summary: [
        this.name,
        `${this.subscribers.size} subscribers`,
        `${this.attachedSockets.size} sockets`,
        `${this.emittedCountValue} emitted`,
        `${this.history.length} buffered`,
      ].join(' | '),
    };
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  close(): void {
    for (const { socket, unsubscribe } of this.attachedSockets.values()) {
      unsubscribe();
      if (socket.close) {
        socket.close(1000, 'stream closed');
      }
    }
    this.attachedSockets.clear();
    this.subscribers.clear();
  }

  private matchesFilter(
    envelope: WebSocketEventEnvelope,
    filter: EventStreamFilter,
  ): boolean {
    if (filter.types !== undefined && filter.types.length > 0) {
      if (!filter.types.includes(envelope.type)) {
        return false;
      }
    }

    if (filter.sources !== undefined && filter.sources.length > 0) {
      if (envelope.source === undefined || !filter.sources.includes(envelope.source)) {
        return false;
      }
    }

    if (
      typeof filter.fromTimestamp === 'number' &&
      envelope.timestamp < filter.fromTimestamp
    ) {
      return false;
    }

    if (
      typeof filter.toTimestamp === 'number' &&
      envelope.timestamp > filter.toTimestamp
    ) {
      return false;
    }

    return true;
  }

  private normalizeFilter(filter: EventStreamFilter): EventStreamFilter {
    return {
      types: filter.types !== undefined ? [...filter.types] : undefined,
      sources: filter.sources !== undefined ? [...filter.sources] : undefined,
      fromTimestamp: filter.fromTimestamp,
      toTimestamp: filter.toTimestamp,
      includeHistory: filter.includeHistory ?? false,
    };
  }

  private validateFilter(filter: EventStreamFilter): void {
    if (!isRecord(filter)) {
      throw new Error('WebSocketEventStream filter must be an object.');
    }
    if (filter.types !== undefined) {
      if (!Array.isArray(filter.types)) {
        throw new Error('WebSocketEventStream filter types must be an array.');
      }
      for (const type of filter.types) {
        if (typeof type !== 'string' || type.trim() === '') {
          throw new Error('WebSocketEventStream filter types must contain non-empty strings.');
        }
      }
    }
    if (filter.sources !== undefined) {
      if (!Array.isArray(filter.sources)) {
        throw new Error('WebSocketEventStream filter sources must be an array.');
      }
      for (const source of filter.sources) {
        if (typeof source !== 'string' || source.trim() === '') {
          throw new Error('WebSocketEventStream filter sources must contain non-empty strings.');
        }
      }
    }
    if (
      filter.fromTimestamp !== undefined &&
      typeof filter.fromTimestamp !== 'number'
    ) {
      throw new Error('WebSocketEventStream filter fromTimestamp must be a finite number.');
    }
    if (
      filter.fromTimestamp !== undefined &&
      !Number.isFinite(filter.fromTimestamp)
    ) {
      throw new Error('WebSocketEventStream filter fromTimestamp must be a finite number.');
    }
    if (
      filter.toTimestamp !== undefined &&
      typeof filter.toTimestamp !== 'number'
    ) {
      throw new Error('WebSocketEventStream filter toTimestamp must be a finite number.');
    }
    if (
      filter.toTimestamp !== undefined &&
      !Number.isFinite(filter.toTimestamp)
    ) {
      throw new Error('WebSocketEventStream filter toTimestamp must be a finite number.');
    }
    if (
      typeof filter.fromTimestamp === 'number' &&
      typeof filter.toTimestamp === 'number' &&
      filter.fromTimestamp > filter.toTimestamp
    ) {
      throw new Error('WebSocketEventStream filter fromTimestamp cannot exceed toTimestamp.');
    }
    if (
      filter.includeHistory !== undefined &&
      typeof filter.includeHistory !== 'boolean'
    ) {
      throw new Error('WebSocketEventStream filter includeHistory must be a boolean.');
    }
  }

  private validateEvent(event: AutomationEvent): void {
    if (!isRecord(event)) {
      throw new Error('WebSocketEventStream event must be an object.');
    }
    assertNonEmpty(event.type, 'Event type');
    if (!Number.isFinite(event.timestamp)) {
      throw new Error('Event timestamp must be a finite number.');
    }
    if (event.source !== undefined && event.source.trim() === '') {
      throw new Error('Event source cannot be empty if provided.');
    }
  }

  private trimHistory(): void {
    if (this.history.length > this.historyLimit) {
      this.history.splice(0, this.history.length - this.historyLimit);
    }
  }

  private createEnvelopeId(): string {
    return `stream-event-${this.nextSequence}`;
  }

  private createSubscriberId(): string {
    return `subscriber-${this.nextSubscriberId++}`;
  }

  private createSocketId(): string {
    return `socket-${this.nextSocketId++}`;
  }
}
