/**
 * CyberSessionService
 * --------------------
 * Owns the canonical `CyberSimulation` instance used by CYRE Studio.
 *
 * Everything in here is a direct call into `@cyre/engine` — the service
 * adds session bookkeeping (seed, scenario provenance, step mode, action
 * availability, replay recording) and never re-implements simulation logic.
 */

import {
  CyberScenarioSimulation,
  CyberSimulation,
} from '@cyre/engine';

import type {
  CyberScenarioDefinition,
  CyberSimulationReplay,
  CyberSimulationState,
} from '@cyre/engine';

export type CyberActionId =
  | 'runRecon'
  | 'discoverServices'
  | 'exploitWebServer'
  | 'escalatePrivileges'
  | 'moveToDatabase'
  | 'accessTarget'
  | 'detectThreats'
  | 'investigateAlert'
  | 'isolateHost'
  | 'blockNetworkPath'
  | 'restoreHost';

export type CyberActionArgs = Partial<{
  alertId: string;
  hostId: string;
  sourceId: string;
  targetId: string;
}>;

export type CyberActionGroup = 'attack' | 'detection' | 'defense';

export interface CyberActionDescriptor {
  id: CyberActionId;
  label: string;
  group: CyberActionGroup;
  description: string;
  /** Argument names the engine method requires, in call order. */
  requiredArgs: Array<keyof CyberActionArgs>;
}

export const CYBER_ACTIONS: readonly CyberActionDescriptor[] = [
  {
    id: 'runRecon',
    label: 'Run Reconnaissance',
    group: 'attack',
    description: 'Probe the perimeter from the internet and record the first contact log.',
    requiredArgs: [],
  },
  {
    id: 'discoverServices',
    label: 'Discover Services',
    group: 'attack',
    description: 'Enumerate exposed services on the web tier.',
    requiredArgs: [],
  },
  {
    id: 'exploitWebServer',
    label: 'Exploit Web Server',
    group: 'attack',
    description: 'Exploit the known web vulnerability to gain user access.',
    requiredArgs: [],
  },
  {
    id: 'escalatePrivileges',
    label: 'Escalate Privileges',
    group: 'attack',
    description: 'Escalate from user to admin on the compromised web server.',
    requiredArgs: [],
  },
  {
    id: 'moveToDatabase',
    label: 'Move Laterally to Database',
    group: 'attack',
    description: 'Pivot from the compromised host into the database segment.',
    requiredArgs: [],
  },
  {
    id: 'accessTarget',
    label: 'Access Target Data',
    group: 'attack',
    description: 'Reach the objective host and complete the attacker goal.',
    requiredArgs: [],
  },
  {
    id: 'detectThreats',
    label: 'Run Detection',
    group: 'detection',
    description: 'Evaluate monitoring logs and raise evidence plus alerts.',
    requiredArgs: [],
  },
  {
    id: 'investigateAlert',
    label: 'Investigate Alert',
    group: 'detection',
    description: 'Move a new alert into the investigating state.',
    requiredArgs: ['alertId'],
  },
  {
    id: 'isolateHost',
    label: 'Isolate Host',
    group: 'defense',
    description: 'Cut a host off the network to stop lateral movement.',
    requiredArgs: ['hostId'],
  },
  {
    id: 'blockNetworkPath',
    label: 'Block Network Path',
    group: 'defense',
    description: 'Block traffic between two hosts.',
    requiredArgs: ['sourceId', 'targetId'],
  },
  {
    id: 'restoreHost',
    label: 'Restore Host',
    group: 'defense',
    description: 'Reimage a host and clear its compromise state.',
    requiredArgs: ['hostId'],
  },
];

export const ATTACK_CHAIN: readonly CyberActionId[] = [
  'runRecon',
  'discoverServices',
  'exploitWebServer',
  'escalatePrivileges',
  'moveToDatabase',
  'accessTarget',
];

const ACTION_LOOKUP: ReadonlyMap<CyberActionId, CyberActionDescriptor> = new Map(
  CYBER_ACTIONS.map((action) => [action.id, action]),
);

/** Looks up an action descriptor, falling back to a synthesised one. */
export function describeCyberAction(action: string): CyberActionDescriptor {
  const found = ACTION_LOOKUP.get(action as CyberActionId);
  if (found) return found;

  return {
    id: action as CyberActionId,
    label: action,
    group: 'attack',
    description: '',
    requiredArgs: [],
  };
}

/** True when the given string is a known engine simulation action. */
export function isCyberActionId(value: string): value is CyberActionId {
  return ACTION_LOOKUP.has(value as CyberActionId);
}

export interface ActionAvailability {
  available: boolean;
  reason: string | null;
}

export interface CyberSessionSnapshot {
  active: boolean;
  seed: number;
  scenarioId: string;
  scenarioName: string;
  scenarioSource: 'catalog' | 'custom' | 'lab';
  state: CyberSimulationState | null;
  time: number;
  stepMode: boolean;
  stepsExecuted: number;
  actionsExecuted: number;
  lastAction: CyberActionId | null;
  lastError: string | null;
  replay: CyberSimulationReplay | null;
}

export interface CyberSessionHooks {
  onAction?: (
    action: CyberActionId,
    args: CyberActionArgs,
    outcome: { success: boolean; error: string | null; durationMs: number },
  ) => void;
  onChange?: () => void;
}

/**
 * Explains, from live engine state, whether an action can run right now.
 * The rules mirror the guards inside `CyberSimulation` so the editor can
 * disable buttons with an accurate reason instead of letting them throw.
 */
export function evaluateActionAvailability(
  state: CyberSimulationState | null,
  action: CyberActionId,
  args: CyberActionArgs = {},
): ActionAvailability {
  if (!state) {
    return { available: false, reason: 'No active simulation. Start one from Simulation ▸ Play.' };
  }

  const host = (id: string | undefined): string | null =>
    id && state.hosts[id] ? id : null;

  switch (action) {
    case 'runRecon':
      return state.attacker.position === 'internet'
        ? { available: true, reason: null }
        : { available: false, reason: 'Attacker must start at the internet edge.' };

    case 'discoverServices':
      return state.attackStage === 'recon'
        ? { available: true, reason: null }
        : { available: false, reason: 'Reconnaissance must be completed first.' };

    case 'exploitWebServer': {
      if (!state.hosts['web-server']) {
        return {
          available: false,
          reason: 'This scenario has no "web-server" host; the canonical exploit chain targets the laboratory network.',
        };
      }
      return state.attacker.discoveredServices.includes('web-server:http')
        ? { available: true, reason: null }
        : { available: false, reason: 'Discover services before exploiting the web server.' };
    }

    case 'escalatePrivileges':
      return state.attacker.position === 'web-server' && state.attacker.privileges === 'user'
        ? { available: true, reason: null }
        : { available: false, reason: 'Requires user access on web-server.' };

    case 'moveToDatabase': {
      if (!state.hosts['database-server']) {
        return {
          available: false,
          reason: 'This scenario has no "database-server" host; the canonical lateral move targets the laboratory network.',
        };
      }
      const current = state.hosts[state.attacker.position];
      if (!current || current.isolated) {
        return { available: false, reason: 'Cannot pivot from an isolated host.' };
      }
      if (state.attacker.privileges !== 'admin') {
        return { available: false, reason: 'Admin privileges are required to move laterally.' };
      }
      if (state.hosts['database-server'].isolated) {
        return { available: false, reason: 'Database server is isolated.' };
      }
      const blocked = state.blockedPaths.some(
        (path) =>
          (path.source === state.attacker.position && path.target === 'database-server') ||
          (path.source === 'database-server' && path.target === state.attacker.position),
      );
      return blocked
        ? { available: false, reason: 'Network path to the database is blocked.' }
        : { available: true, reason: null };
    }

    case 'accessTarget':
      return state.attacker.position === 'database-server'
        ? { available: true, reason: null }
        : { available: false, reason: 'Attacker must be on the database server.' };

    case 'detectThreats':
      return state.monitoring.enabled
        ? { available: true, reason: null }
        : { available: false, reason: 'Monitoring is disabled on this scenario.' };

    case 'investigateAlert': {
      const alert = state.alerts.find((entry) => entry.id === args.alertId);
      if (!alert) return { available: false, reason: 'Select an alert to investigate.' };
      return alert.status === 'new'
        ? { available: true, reason: null }
        : { available: false, reason: `Alert is already "${alert.status}".` };
    }

    case 'isolateHost': {
      const id = host(args.hostId);
      if (!id) return { available: false, reason: 'Select a host to isolate.' };
      return state.hosts[id].isolated
        ? { available: false, reason: 'Host is already isolated.' }
        : { available: true, reason: null };
    }

    case 'blockNetworkPath': {
      const source = host(args.sourceId);
      const target = host(args.targetId);
      if (!source || !target) return { available: false, reason: 'Select both a source and a target host.' };
      const already = state.blockedPaths.some(
        (path) => path.source === source && path.target === target,
      );
      return already
        ? { available: false, reason: 'That path is already blocked.' }
        : { available: true, reason: null };
    }

    case 'restoreHost': {
      const id = host(args.hostId);
      if (!id) return { available: false, reason: 'Select a host to restore.' };
      const entry = state.hosts[id];
      return entry.isolated || entry.compromised || entry.accessLevel !== 'none'
        ? { available: true, reason: null }
        : { available: false, reason: 'Host is already in a clean state.' };
    }

    default:
      return { available: false, reason: 'Unknown action.' };
  }
}

export class CyberSessionService {
  private simulation: CyberSimulation | null = null;
  private scenarioId = 'lab-basic';
  private scenarioName = 'CYRE Laboratory Network';
  private scenarioSource: CyberSessionSnapshot['scenarioSource'] = 'lab';
  private seed = 42;
  private stepMode = false;
  private stepsExecuted = 0;
  private actionsExecuted = 0;
  private lastAction: CyberActionId | null = null;
  private lastError: string | null = null;
  private readonly hooks: CyberSessionHooks;

  constructor(hooks: CyberSessionHooks = {}) {
    this.hooks = hooks;
  }

  isActive(): boolean {
    return this.simulation !== null;
  }

  getSimulation(): CyberSimulation | null {
    return this.simulation;
  }

  getSeed(): number {
    return this.seed;
  }

  getTime(): number {
    return this.simulation?.getTime() ?? 0;
  }

  isStepMode(): boolean {
    return this.stepMode;
  }

  setStepMode(enabled: boolean): void {
    this.stepMode = enabled;
    this.hooks.onChange?.();
  }

  /** Initializes a fresh simulation, optionally seeded from a scenario. */
  initialize(seed: number, scenario: CyberScenarioDefinition | null = null): void {
    if (!Number.isInteger(seed) || seed < 0) {
      throw new Error('Simulation seed must be a non-negative integer.');
    }

    this.seed = seed;

    if (scenario) {
      const scenarioSimulation = new CyberScenarioSimulation(scenario);
      scenarioSimulation.initialize();
      const scenarioState = scenarioSimulation.getState();

      // The scenario supplies the topology; the caller supplies the RNG seed,
      // so an explicitly chosen seed always wins over the catalog default.
      const simulation = new CyberSimulation(seed);
      simulation.initialize();
      simulation.loadState(scenarioState);

      this.simulation = simulation;
      this.scenarioId = scenario.id;
      this.scenarioName = scenario.name;
      this.scenarioSource = 'catalog';
    } else {
      const simulation = new CyberSimulation(seed);
      simulation.initialize();
      this.simulation = simulation;
      this.scenarioId = 'cyber-lab';
      this.scenarioName = 'CYRE Laboratory Network';
      this.scenarioSource = 'lab';
    }

    this.stepsExecuted = 0;
    this.actionsExecuted = 0;
    this.lastAction = null;
    this.lastError = null;
    this.hooks.onChange?.();
  }

  /** Runs the canonical three-step laboratory opening used by Play. */
  runCanonicalOpening(): void {
    this.execute('runRecon');
    this.execute('discoverServices');
    this.execute('exploitWebServer');
  }

  execute(action: CyberActionId, args: CyberActionArgs = {}): void {
    if (!this.simulation) {
      throw new Error('Cyber simulation is not initialized.');
    }

    const startedAt = performance.now();
    let error: string | null = null;

    try {
      this.dispatch(this.simulation, action, args);
    } catch (thrown) {
      error = thrown instanceof Error ? thrown.message : String(thrown);
      this.lastError = error;
      this.hooks.onAction?.(action, args, {
        success: false,
        error,
        durationMs: performance.now() - startedAt,
      });
      this.hooks.onChange?.();
      throw thrown;
    }

    this.actionsExecuted += 1;
    this.lastAction = action;
    this.lastError = null;
    this.hooks.onAction?.(action, args, {
      success: true,
      error: null,
      durationMs: performance.now() - startedAt,
    });
    this.hooks.onChange?.();
  }

  /** Advances the deterministic clock by one tick. */
  step(): number {
    if (!this.simulation) {
      throw new Error('Cyber simulation is not initialized.');
    }
    const time = this.simulation.step();
    this.stepsExecuted += 1;
    this.hooks.onChange?.();
    return time;
  }

  getState(): CyberSimulationState | null {
    return this.simulation?.getState() ?? null;
  }

  getReplay(): CyberSimulationReplay | null {
    return this.simulation?.createReplay() ?? null;
  }

  /** Loads a replay file back into the session. */
  loadReplay(replay: CyberSimulationReplay): void {
    this.simulation = CyberSimulation.replay(replay);
    this.seed = replay.seed;
    this.scenarioId = replay.scenarioId;
    this.scenarioName = replay.scenarioId;
    this.scenarioSource = 'catalog';
    this.actionsExecuted = replay.actions.length;
    this.lastAction = null;
    this.lastError = null;
    this.hooks.onChange?.();
  }

  /**
   * Materialises the replay truncated to `count` actions, which is how the
   * editor steps through a recorded replay deterministically.
   */
  replayUpTo(replay: CyberSimulationReplay, count: number): CyberSimulationState {
    const limit = Math.max(0, Math.min(count, replay.actions.length));
    const simulation = CyberSimulation.replay({
      ...replay,
      actions: replay.actions.slice(0, limit),
    });
    return simulation.getState();
  }

  stop(): void {
    this.simulation = null;
    this.stepsExecuted = 0;
    this.actionsExecuted = 0;
    this.lastAction = null;
    this.lastError = null;
    this.hooks.onChange?.();
  }

  snapshot(): CyberSessionSnapshot {
    return {
      active: this.simulation !== null,
      seed: this.seed,
      scenarioId: this.scenarioId,
      scenarioName: this.scenarioName,
      scenarioSource: this.scenarioSource,
      state: this.getState(),
      time: this.getTime(),
      stepMode: this.stepMode,
      stepsExecuted: this.stepsExecuted,
      actionsExecuted: this.actionsExecuted,
      lastAction: this.lastAction,
      lastError: this.lastError,
      replay: this.getReplay(),
    };
  }

  markCustomScenario(scenario: CyberScenarioDefinition): void {
    this.scenarioId = scenario.id;
    this.scenarioName = scenario.name;
    this.scenarioSource = 'custom';
  }

  private dispatch(
    simulation: CyberSimulation,
    action: CyberActionId,
    args: CyberActionArgs,
  ): void {
    switch (action) {
      case 'runRecon':
        simulation.runRecon();
        return;
      case 'discoverServices':
        simulation.discoverServices();
        return;
      case 'exploitWebServer':
        simulation.exploitWebServer();
        return;
      case 'escalatePrivileges':
        simulation.escalatePrivileges();
        return;
      case 'moveToDatabase':
        simulation.moveToDatabase();
        return;
      case 'accessTarget':
        simulation.accessTarget();
        return;
      case 'detectThreats':
        simulation.detectThreats();
        return;
      case 'investigateAlert':
        if (!args.alertId) throw new Error('An alert id is required to investigate.');
        simulation.investigateAlert(args.alertId);
        return;
      case 'isolateHost':
        if (!args.hostId) throw new Error('A host id is required to isolate.');
        simulation.isolateHost(args.hostId);
        return;
      case 'blockNetworkPath':
        if (!args.sourceId || !args.targetId) {
          throw new Error('A source and target host are required to block a path.');
        }
        simulation.blockNetworkPath(args.sourceId, args.targetId);
        return;
      case 'restoreHost':
        if (!args.hostId) throw new Error('A host id is required to restore.');
        simulation.restoreHost(args.hostId);
        return;
      default:
        throw new Error(`Unknown cyber simulation action "${String(action)}".`);
    }
  }
}
