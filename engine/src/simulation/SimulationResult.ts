import type { SimulationEvent } from './SimulationEvent.js';

export interface SimulationResult {
  success: boolean;
  time: number;
  state: Record<string, unknown>;
  events: SimulationEvent[];
  error?: Error;
}
