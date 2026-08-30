import { Simulation } from '../../simulation/index.js';
import type { SimulationAction, SimulationWorld } from '../../simulation/index.js';
import { AttackStage } from '../AttackStage.js';
import type {
  CyberSimulationState,
  CyberHostState,
  CyberDetectionEvidence,
  CyberAlert,
} from './CyberSimulationTypes.js';

export interface CyberSimulationReplayAction {
  method: string;
  args?: Record<string, unknown>;
}

export interface CyberSimulationReplay {
  formatVersion: number;
  engineVersion: string;
  scenarioId: string;
  seed: number;
  actions: CyberSimulationReplayAction[];
}

const CYBER_REPLAY_FORMAT_VERSION = 1;
const CYRE_ENGINE_VERSION = '1.0.4';

function cloneState(state: Record<string, unknown>): CyberSimulationState {
  return JSON.parse(JSON.stringify(state)) as CyberSimulationState;
}

function createLaboratoryState(): CyberSimulationState {
  const hosts: Record<string, CyberHostState> = {
    'internet': {
      id: 'internet',
      name: 'Internet',
      type: 'internet',
      compromised: false,
      accessLevel: 'none',
      services: [],
      vulnerabilities: [],
      isolated: false,
    },
    'gateway': {
      id: 'gateway',
      name: 'Gateway',
      type: 'gateway',
      compromised: false,
      accessLevel: 'none',
      services: [{ name: 'https', port: 443, protocol: 'tcp' }],
      vulnerabilities: [],
      isolated: false,
    },
    'web-server': {
      id: 'web-server',
      name: 'Web Server',
      type: 'web_server',
      compromised: false,
      accessLevel: 'none',
      services: [
        { name: 'http', port: 80, protocol: 'tcp', vulnerability: 'CVE-2024-1234' },
        { name: 'https', port: 443, protocol: 'tcp', vulnerability: 'CVE-2024-1234' },
      ],
      vulnerabilities: ['CVE-2024-1234'],
      isolated: false,
    },
    'database-server': {
      id: 'database-server',
      name: 'Database Server',
      type: 'database_server',
      compromised: false,
      accessLevel: 'none',
      services: [{ name: 'postgresql', port: 5432, protocol: 'tcp' }],
      vulnerabilities: [],
      isolated: false,
    },
    'admin-workstation': {
      id: 'admin-workstation',
      name: 'Admin Workstation',
      type: 'admin_workstation',
      compromised: false,
      accessLevel: 'none',
      services: [],
      vulnerabilities: [],
      isolated: false,
    },
  };

  return {
    hosts,
    attacker: {
      position: 'internet',
      privileges: 'none',
      discoveredServices: [],
    },
    attackStage: AttackStage.Recon,
    objective: {
      targetHostId: 'database-server',
      achieved: false,
    },
    monitoring: {
      enabled: true,
      logs: [],
    },
    evidence: [],
    alerts: [],
    defenderActions: [],
    blockedPaths: [],
  };
}

function detectSeverity(logType: string): CyberAlert['severity'] | null {
  switch (logType) {
    case 'recon':
    case 'service_discovery':
      return 'low';
    case 'exploit':
    case 'lateral_movement':
      return 'high';
    case 'privilege_escalation':
    case 'target_access':
      return 'critical';
    default:
      return null;
  }
}

export class CyberSimulation {
  private readonly simulation: Simulation;
  private readonly seed: number;
  private readonly replayLog: CyberSimulationReplayAction[] = [];

  constructor(seed = 42) {
    this.seed = seed;
    this.simulation = new Simulation({
      id: 'cyber-lab',
      name: 'CYRE Laboratory Network',
      seed,
    });
  }

  initialize(): void {
    this.simulation.initialize();
    this.simulation.executeAction({
      id: 'init-state',
      type: 'initialize',
      execute: () => ({
        patch: createLaboratoryState() as unknown as Record<string, unknown>,
      }),
    });
  }

  getState(): CyberSimulationState {
    return cloneState(this.simulation.getState());
  }

  loadState(state: CyberSimulationState): void {
    this.simulation.executeAction({
      id: 'load-state',
      type: 'load-state',
      execute: () => ({
        patch: state as unknown as Record<string, unknown>,
      }),
    });
  }

  getTime(): number {
    return this.simulation.getTime();
  }

  /**
   * The canonical kernel this simulation runs on. Exposed so callers can
   * inspect authoritative world state, time and the event log directly
   * rather than through the cyber-specific view.
   */
  getWorld(): SimulationWorld<Record<string, unknown>> {
    return this.simulation.getWorld();
  }

  getSeed(): number {
    return this.seed;
  }

  /**
   * Advances the deterministic simulation clock by exactly one tick.
   * Exposes the canonical runtime's step mode so an editor can advance a
   * scenario one deterministic frame at a time.
   */
  step(): number {
    const result = this.simulation.step();
    if (!result.success) {
      throw result.error ?? new Error('Cyber simulation step failed.');
    }
    return this.simulation.getTime();
  }

  getEventHistory() {
    return this.simulation.getEvents();
  }

  createReplay(): CyberSimulationReplay {
    if (!this.simulation.isInitialized()) {
      throw new Error('Cannot create replay before simulation initialized.');
    }
    return {
      formatVersion: CYBER_REPLAY_FORMAT_VERSION,
      engineVersion: CYRE_ENGINE_VERSION,
      scenarioId: 'cyber-lab',
      seed: this.seed,
      actions: this.replayLog.map((action) => ({
        method: action.method,
        args: action.args ? JSON.parse(JSON.stringify(action.args)) : undefined,
      })),
    };
  }

  static replay(replay: CyberSimulationReplay): CyberSimulation {
    CyberSimulation.validateReplay(replay);

    const sim = new CyberSimulation(replay.seed);
    sim.initialize();

    for (const action of replay.actions) {
      switch (action.method) {
        case 'runRecon':
          sim.runRecon();
          break;
        case 'discoverServices':
          sim.discoverServices();
          break;
        case 'exploitWebServer':
          sim.exploitWebServer();
          break;
        case 'escalatePrivileges':
          sim.escalatePrivileges();
          break;
        case 'moveToDatabase':
          sim.moveToDatabase();
          break;
        case 'accessTarget':
          sim.accessTarget();
          break;
        case 'detectThreats':
          sim.detectThreats();
          break;
        case 'investigateAlert':
          sim.investigateAlert(
            CyberSimulation.assertReplayString(action.args?.alertId, 'alertId'),
          );
          break;
        case 'isolateHost':
          sim.isolateHost(
            CyberSimulation.assertReplayString(action.args?.hostId, 'hostId'),
          );
          break;
        case 'blockNetworkPath':
          sim.blockNetworkPath(
            CyberSimulation.assertReplayString(action.args?.sourceId, 'sourceId'),
            CyberSimulation.assertReplayString(action.args?.targetId, 'targetId'),
          );
          break;
        case 'restoreHost':
          sim.restoreHost(
            CyberSimulation.assertReplayString(action.args?.hostId, 'hostId'),
          );
          break;
        default:
          throw new Error(`Unknown replay action method "${action.method}".`);
      }
    }

    return sim;
  }

  static replayFromJSON(json: string): CyberSimulation {
    let replay: unknown;
    try {
      replay = JSON.parse(json);
    } catch {
      throw new Error('Invalid replay JSON.');
    }
    return CyberSimulation.replay(replay as CyberSimulationReplay);
  }

  runRecon(): void {
    this.executeCyberAction('recon', 'recon', (state) => {
      if (state.attacker.position !== 'internet') {
        throw new Error('Attacker must start at internet for recon.');
      }
      state.attacker.discoveredServices.push('gateway:https');
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'recon',
        source: 'internet',
        target: 'gateway',
      });
      state.attackStage = AttackStage.Recon;
    });
    this.recordReplay('runRecon');
  }

  discoverServices(): void {
    this.executeCyberAction('service-discovery', 'service_discovery', (state) => {
      if (state.attackStage !== AttackStage.Recon) {
        throw new Error('Must complete recon before service discovery.');
      }
      state.attacker.discoveredServices.push('web-server:http', 'web-server:https');
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'service_discovery',
        source: 'internet',
        target: 'web-server',
      });
    });
    this.recordReplay('discoverServices');
  }

  exploitWebServer(): void {
    this.executeCyberAction('exploit-web', 'vulnerability_exploitation', (state) => {
      if (!state.attacker.discoveredServices.includes('web-server:http')) {
        throw new Error('Must discover web service before exploitation.');
      }
      const webHost = state.hosts['web-server'];
      if (!webHost) {
        throw new Error('Web server host missing.');
      }
      webHost.compromised = true;
      webHost.accessLevel = 'user';
      state.attacker.position = 'web-server';
      state.attacker.privileges = 'user';
      state.attackStage = AttackStage.InitialAccess;
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'exploit',
        source: 'internet',
        target: 'web-server',
      });
    });
    this.recordReplay('exploitWebServer');
  }

  escalatePrivileges(): void {
    this.executeCyberAction('escalate', 'privilege_escalation', (state) => {
      if (state.attacker.position !== 'web-server' || state.attacker.privileges !== 'user') {
        throw new Error('Must have user access on web-server to escalate privileges.');
      }
      state.hosts['web-server'].accessLevel = 'admin';
      state.attacker.privileges = 'admin';
      state.attackStage = AttackStage.PrivilegeEscalation;
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'privilege_escalation',
        source: 'web-server',
      });
    });
    this.recordReplay('escalatePrivileges');
  }

  moveToDatabase(): void {
    this.executeCyberAction('lateral-db', 'lateral_movement', (state) => {
      const currentHostId = state.attacker.position;
      const currentHost = state.hosts[currentHostId];
      if (!currentHost || currentHost.isolated) {
        throw new Error('Cannot move laterally from an isolated host.');
      }
      if (state.attacker.privileges !== 'admin') {
        throw new Error('Must have admin privileges to move laterally.');
      }
      const target = state.hosts['database-server'];
      if (!target || target.isolated) {
        throw new Error('Database server is isolated and cannot be reached.');
      }
      const isBlocked = state.blockedPaths.some(
        (path) =>
          (path.source === currentHostId && path.target === 'database-server') ||
          (path.source === 'database-server' && path.target === currentHostId),
      );
      if (isBlocked) {
        throw new Error('Network path between current host and database is blocked.');
      }

      state.attacker.position = 'database-server';
      state.attacker.privileges = 'user';
      target.compromised = true;
      target.accessLevel = 'user';
      state.attackStage = AttackStage.LateralMovement;
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'lateral_movement',
        source: currentHostId,
        target: 'database-server',
      });
    });
    this.recordReplay('moveToDatabase');
  }

  accessTarget(): void {
    this.executeCyberAction('access-target', 'target_access', (state) => {
      if (state.attacker.position !== 'database-server') {
        throw new Error('Must be on database server to access target.');
      }
      state.objective.achieved = true;
      state.attackStage = AttackStage.Exfiltration;
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'target_access',
        source: 'database-server',
      });
    });
    this.recordReplay('accessTarget');
  }

  detectThreats(): void {
    this.executeCyberAction('detect-threats', 'detection', (state) => {
      if (!state.monitoring.enabled) return;

      const evidence: CyberDetectionEvidence[] = [...state.evidence];
      const alerts: CyberAlert[] = [...state.alerts];

      state.monitoring.logs.forEach((log, index) => {
        const evidenceId = 'evidence-' + (index + 1);
        if (!evidence.some((item) => item.id === evidenceId)) {
          evidence.push({
            id: evidenceId,
            type: log.type,
            description: 'Log: ' + log.type + ' from ' + log.source + (log.target ? ' to ' + log.target : ''),
            sourceId: log.source,
            timestamp: log.timestamp,
          });
        }

        const severity = detectSeverity(log.type);
        if (severity) {
          const alertId = 'alert-' + log.type + '-' + (index + 1);
          if (!alerts.some((alert) => alert.id === alertId)) {
            alerts.push({
              id: alertId,
              severity,
              title: log.type + ' detected',
              description: 'Detection rule matched ' + log.type + ' from ' + log.source + (log.target ? ' to ' + log.target : '') + '.',
              sourceId: log.source,
              timestamp: log.timestamp,
              status: 'new',
            });
          }
        }
      });

      state.evidence = evidence;
      state.alerts = alerts;
    });
    this.recordReplay('detectThreats');
  }

  investigateAlert(alertId: string): void {
    this.executeCyberAction('investigate-alert', 'defender_investigate', (state) => {
      const alert = state.alerts.find((item) => item.id === alertId);
      if (!alert) throw new Error('Alert "' + alertId + '" not found.');
      if (alert.status !== 'new') throw new Error('Cannot investigate alert in status "' + alert.status + '".');
      alert.status = 'investigating';
      state.defenderActions.push({
        action: 'investigate',
        targetId: alertId,
        timestamp: this.simulation.getTime(),
      });
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'defender_investigate',
        source: 'soc',
        target: alert.sourceId,
      });
    });
    this.recordReplay('investigateAlert', { alertId });
  }

  isolateHost(hostId: string): void {
    this.executeCyberAction('isolate-host', 'defender_isolate', (state) => {
      const host = state.hosts[hostId];
      if (!host) throw new Error('Host "' + hostId + '" not found.');
      if (host.isolated) throw new Error('Host "' + hostId + '" is already isolated.');
      host.isolated = true;
      state.defenderActions.push({
        action: 'isolate',
        targetId: hostId,
        timestamp: this.simulation.getTime(),
      });
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'defender_isolate',
        source: 'soc',
        target: hostId,
      });
    });
    this.recordReplay('isolateHost', { hostId });
  }

  blockNetworkPath(sourceId: string, targetId: string): void {
    this.executeCyberAction('block-path', 'defender_block', (state) => {
      if (!state.hosts[sourceId] || !state.hosts[targetId]) {
        throw new Error('Source or target host for blocked path does not exist.');
      }
      const alreadyBlocked = state.blockedPaths.some(
        (path) => path.source === sourceId && path.target === targetId,
      );
      if (alreadyBlocked) throw new Error('Network path is already blocked.');
      state.blockedPaths.push({ source: sourceId, target: targetId });
      state.defenderActions.push({
        action: 'block',
        targetId: sourceId + '->' + targetId,
        timestamp: this.simulation.getTime(),
      });
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'defender_block',
        source: sourceId,
        target: targetId,
      });
    });
    this.recordReplay('blockNetworkPath', { sourceId, targetId });
  }

  restoreHost(hostId: string): void {
    this.executeCyberAction('restore-host', 'defender_restore', (state) => {
      const host = state.hosts[hostId];
      if (!host) throw new Error('Host "' + hostId + '" not found.');
      if (!host.isolated && !host.compromised && host.accessLevel === 'none') {
        throw new Error('Host "' + hostId + '" is already restored.');
      }
      host.isolated = false;
      host.compromised = false;
      host.accessLevel = 'none';
      if (state.attacker.position === hostId) {
        state.attacker.position = 'internet';
        state.attacker.privileges = 'none';
      }
      state.defenderActions.push({
        action: 'restore',
        targetId: hostId,
        timestamp: this.simulation.getTime(),
      });
      state.monitoring.logs.push({
        timestamp: this.simulation.getTime(),
        type: 'defender_restore',
        source: 'soc',
        target: hostId,
      });
    });
    this.recordReplay('restoreHost', { hostId });
  }

  private executeCyberAction(
    id: string,
    type: string,
    mutate: (state: CyberSimulationState) => void,
  ): void {
    const action: SimulationAction = {
      id,
      type,
      execute: (context) => {
        const current = cloneState(context.getState());
        mutate(current);
        return { patch: current as unknown as Record<string, unknown> };
      },
    };
    const result = this.simulation.executeAction(action);
    if (!result.success) {
      throw result.error ?? new Error('Cyber simulation action failed: ' + id);
    }
  }

  private recordReplay(method: string, args?: Record<string, unknown>): void {
    this.replayLog.push({
      method,
      args: args ? JSON.parse(JSON.stringify(args)) : undefined,
    });
  }

  private static assertReplayString(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Replay ${label} must be a non-empty string.`);
    }
    return value;
  }

  private static validateReplay(replay: CyberSimulationReplay): void {
    if (!replay || typeof replay !== 'object' || Array.isArray(replay)) {
      throw new Error('Replay must be an object.');
    }
    if (replay.formatVersion !== CYBER_REPLAY_FORMAT_VERSION) {
      throw new Error(`Unsupported replay format version "${replay.formatVersion}".`);
    }
    if (typeof replay.engineVersion !== 'string' || replay.engineVersion.trim() === '') {
      throw new Error('Replay engineVersion must be a non-empty string.');
    }
    if (typeof replay.scenarioId !== 'string' || replay.scenarioId.trim() === '') {
      throw new Error('Replay scenarioId must be a non-empty string.');
    }
    if (!Number.isInteger(replay.seed) || replay.seed < 0) {
      throw new Error('Replay seed must be a non-negative integer.');
    }
    if (!Array.isArray(replay.actions)) {
      throw new Error('Replay actions must be an array.');
    }

    for (const action of replay.actions) {
      if (!action || typeof action !== 'object' || Array.isArray(action)) {
        throw new Error('Replay action must be an object.');
      }
      if (typeof action.method !== 'string' || action.method.trim() === '') {
        throw new Error('Replay action method must be a non-empty string.');
      }
      if (action.args !== undefined && (typeof action.args !== 'object' || Array.isArray(action.args))) {
        throw new Error('Replay action args must be an object if provided.');
      }
    }
  }
}
