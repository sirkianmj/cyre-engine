import type { SimulationConfig } from './SimulationConfig.js';
import type { SimulationEvent } from './SimulationEvent.js';
import type { SeededRandom } from './SeededRandom.js';

export interface SimulationActionContext {
  config: Readonly<SimulationConfig>;
  now(): number;
  getState(): Record<string, unknown>;
  random: SeededRandom;
}

export interface SimulationActionResult {
  patch?: Record<string, unknown>;
  events?: SimulationEvent[];
}

export interface SimulationAction {
  id: string;
  type: string;
  execute(context: SimulationActionContext): SimulationActionResult | void;
}
