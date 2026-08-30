import { ManualSimulationClock, type SimulationClock } from './SimulationClock.js';
import { SimulationState } from './SimulationState.js';
import { SimulationWorld } from './SimulationWorld.js';
import type { SimulationConfig } from './SimulationConfig.js';
import type { SimulationAction, SimulationActionContext } from './SimulationAction.js';
import type { SimulationEvent } from './SimulationEvent.js';
import type { SimulationResult } from './SimulationResult.js';
import { SeededRandom } from './SeededRandom.js';

interface SerializedSimulation {
  version: number;
  config: SimulationConfig;
  time: number;
  state: Record<string, unknown>;
  initialized: boolean;
  eventHistory: SimulationEvent[];
  randomState: number;
}

const SERIALIZATION_VERSION = 1;

export class Simulation {
  private readonly config: SimulationConfig;
  private readonly clock: SimulationClock;
  /**
   * The authoritative kernel. State, world time and the canonical event log
   * all live here, so every simulation in the engine shares one runtime
   * rather than two parallel implementations.
   */
  private readonly world: SimulationWorld<Record<string, unknown>>;
  private state: SimulationState;
  private initialized = false;
  private readonly tickDurationMs: number;
  private random: SeededRandom;

  constructor(config: SimulationConfig, clock?: SimulationClock) {
    if (!config || !config.id || config.id.trim() === '') {
      throw new Error('Simulation config id must be a non-empty string.');
    }
    this.config = { ...config };
    this.clock = clock ?? new ManualSimulationClock(config.startTime ?? 0);
    this.tickDurationMs = config.tickDurationMs ?? 1;
    this.random = new SeededRandom(config.seed ?? 0);
    if (!Number.isFinite(this.tickDurationMs) || this.tickDurationMs <= 0) {
      throw new Error('Simulation config tickDurationMs must be a positive finite number.');
    }
    this.state = new SimulationState();
    this.world = new SimulationWorld<Record<string, unknown>>(this.state.getAll(), {
      clock: this.clock,
    });
  }

  initialize(): void {
    if (this.initialized) {
      throw new Error('Simulation is already initialized.');
    }
    this.initialized = true;
    this.publishEvent({
      type: 'simulation.initialized',
      timestamp: this.clock.now(),
      source: 'simulation',
      data: { configId: this.config.id },
    });
  }

  executeAction(action: SimulationAction): SimulationResult {
    this.assertInitialized();
    this.validateAction(action);

    const startTime = this.clock.now();
    const context: SimulationActionContext = {
      config: Object.freeze({ ...this.config }),
      now: () => this.clock.now(),
      getState: () => this.state.getAll(),
      random: this.random,
    };

    let patch: Record<string, unknown> | undefined;
    let events: SimulationEvent[] | undefined;

    try {
      const result = action.execute(context);
      if (result) {
        patch = result.patch;
        events = result.events;
      }
    } catch (error) {
      return {
        success: false,
        time: this.clock.now(),
        state: this.state.getAll(),
        events: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    if (patch) {
      this.state.applyPatch(patch);
      this.world.replaceState(this.state.getAll());
    }

    const resolvedEvents: SimulationEvent[] = [];
    if (events) {
      for (const event of events) {
        const timestamp = event.timestamp ?? this.clock.now();
        const fullEvent: SimulationEvent = {
          id: event.id ?? action.id + '-event-' + (resolvedEvents.length + 1),
          type: event.type,
          timestamp,
          source: event.source ?? action.id,
          data: event.data,
        };
        resolvedEvents.push(fullEvent);
        this.publishEvent(fullEvent);
      }
    }

    this.publishEvent({
      type: 'simulation.action',
      timestamp: this.clock.now(),
      source: 'simulation',
      data: { actionId: action.id, actionType: action.type, startTime },
    });

    return {
      success: true,
      time: this.clock.now(),
      state: this.state.getAll(),
      events: resolvedEvents,
    };
  }

  step(): SimulationResult {
    this.assertInitialized();
    const beforeTime = this.clock.now();
    this.advanceClock(this.tickDurationMs);
    const afterTime = this.clock.now();

    this.publishEvent({
      type: 'simulation.tick',
      timestamp: afterTime,
      source: 'simulation',
      data: { from: beforeTime, to: afterTime },
    });

    return {
      success: true,
      time: afterTime,
      state: this.state.getAll(),
      events: [],
    };
  }

  advanceTime(ms: number): void {
    this.assertInitialized();
    if (!Number.isFinite(ms) || ms < 0) {
      throw new Error('Simulation advanceTime ms must be a non-negative finite number.');
    }
    this.advanceClock(ms);
  }

  serialize(): string {
    const payload: SerializedSimulation = {
      version: SERIALIZATION_VERSION,
      config: this.config,
      time: this.world.now(),
      state: this.state.toJSON(),
      initialized: this.initialized,
      eventHistory: this.world.getEvents(),
      randomState: this.random.getState(),
    };
    return JSON.stringify(payload);
  }

  static restore(serialized: string): Simulation {
    let payload: SerializedSimulation;
    try {
      payload = JSON.parse(serialized) as SerializedSimulation;
    } catch {
      throw new Error('Invalid simulation serialization.');
    }
    if (payload.version !== SERIALIZATION_VERSION) {
      throw new Error('Unsupported simulation serialization version: ' + payload.version + '.');
    }
    const simulation = new Simulation(payload.config, new ManualSimulationClock(payload.time));
    simulation.state = SimulationState.fromJSON(payload.state);
    simulation.initialized = payload.initialized;
    (simulation as unknown as { random: SeededRandom }).random = SeededRandom.fromState(payload.randomState ?? payload.config.seed ?? 0);

    // Restore the kernel, not just the wrapper, so a restored simulation runs
    // on the same authoritative state, time and event log.
    simulation.world.replaceState(simulation.state.getAll());
    simulation.world.setTime(payload.time);
    simulation.world.restoreEvents(payload.eventHistory ?? []);
    return simulation;
  }

  getState(): Record<string, unknown> {
    return this.world.getState();
  }

  getTime(): number {
    return this.world.now();
  }

  getEvents(): SimulationEvent[] {
    return this.world.getEvents();
  }

  /** The canonical kernel this simulation runs on. */
  getWorld(): SimulationWorld<Record<string, unknown>> {
    return this.world;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private publishEvent(event: SimulationEvent): void {
    this.world.emit(event);
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error('Simulation must be initialized before use.');
    }
  }

  private validateAction(action: SimulationAction): void {
    if (!action || !action.id || action.id.trim() === '') {
      throw new Error('SimulationAction id must be a non-empty string.');
    }
    if (!action.type || action.type.trim() === '') {
      throw new Error('SimulationAction type must be a non-empty string.');
    }
    if (typeof action.execute !== 'function') {
      throw new Error('SimulationAction execute must be a function.');
    }
  }

  private advanceClock(ms: number): void {
    this.world.advance(ms);
  }
}
