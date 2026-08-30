/**
 * ReplayEvent
 * ------------
 * A single event recorded for replay.
 */

export interface ReplayEvent {
  id: string;
  timestamp: number;
  type: string;
  data?: unknown;
}
