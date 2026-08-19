import type { BaseEvent } from '../core/index.js';

export interface DebugEventRecord {
  sequence: number;
  event: BaseEvent;
  receivedAt: number;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDebugEventRecord(
  sequence: number,
  event: BaseEvent,
  receivedAt = Date.now(),
): DebugEventRecord {
  return {
    sequence,
    event: deepClone(event),
    receivedAt,
  };
}
