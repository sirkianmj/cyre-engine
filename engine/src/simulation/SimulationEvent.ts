/**
 * SimulationEvent
 * ----------------
 * A canonical simulation event. Independent of core event bus.
 */

export interface SimulationEvent {
  id?: string;
  type: string;
  timestamp: number;
  source?: string;
  data?: unknown;
}
