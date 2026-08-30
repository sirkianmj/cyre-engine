/**
 * SecurityService
 * ----------------
 * Exposes the engine's scenario sandbox, security sandbox policy and
 * security audit system to CYRE Studio.
 *
 * Nothing here re-implements a check: the sandbox execution, the policy
 * violations and the audit report all come from `@cyre/engine`.
 */

import {
  CyberScenarioSandbox,
  NetworkGraph,
  SecurityAuditSystem,
  SecuritySandboxPolicy,
} from '@cyre/engine';

import type {
  CyberSimulationState,
  SecurityAuditReport,
  SecuritySandboxViolation,
} from '@cyre/engine';

export interface SandboxCheckResult {
  name: string;
  payload: string;
  rejected: boolean;
  escaped: boolean;
  error: string | null;
  hostCount: number;
}

export interface SecurityValidationReport {
  ranAt: number;
  scenarioId: string | null;
  sandbox: SandboxCheckResult;
  policyViolations: SecuritySandboxViolation[];
  hostileChecks: SandboxCheckResult[];
  audit: SecurityAuditReport | null;
  passed: boolean;
}

/**
 * Hostile scenario payloads used to prove the sandbox rejects them.
 * Each one targets a different guard in `SecuritySandboxPolicy` or the
 * scenario deserializer.
 */
export const HOSTILE_SCENARIO_PAYLOADS: ReadonlyArray<{ name: string; payload: string }> = [
  {
    name: 'Prototype pollution key',
    // Written by hand: JSON.stringify() drops a literal `__proto__` key, so
    // the hostile document has to be spelled out to survive the round trip.
    payload:
      '{"__proto__": {"polluted": true}, "id": "hostile-proto", ' +
      '"name": "Hostile Proto", "nodes": [{"id": "internet", "name": "Internet", "type": "internet"}]}',
  },
  {
    name: 'Missing scenario id',
    payload: JSON.stringify({
      name: 'No Id',
      nodes: [{ id: 'internet', name: 'Internet', type: 'internet' }],
    }),
  },
  {
    name: 'Empty node list',
    payload: JSON.stringify({ id: 'empty', name: 'Empty', nodes: [] }),
  },
  {
    name: 'Nodes field is not an array',
    payload: JSON.stringify({ id: 'bad-nodes', name: 'Bad Nodes', nodes: 'not-an-array' }),
  },
  {
    name: 'Malformed JSON',
    payload: '{ "id": "broken", ',
  },
  {
    name: 'JSON array instead of object',
    payload: JSON.stringify([{ id: 'array', name: 'Array', nodes: [] }]),
  },
];

export class SecurityService {
  private reports: SecurityValidationReport[] = [];
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(): SecurityValidationReport[] {
    return [...this.reports];
  }

  clear(): void {
    if (this.reports.length === 0) return;
    this.reports = [];
    this.emit();
  }

  /** Runs the engine sandbox against a raw scenario JSON document. */
  executeInSandbox(name: string, payload: string): SandboxCheckResult {
    const result = CyberScenarioSandbox.execute(payload);
    const hostCount = result.state
      ? Object.keys((result.state as { hosts: Record<string, unknown> }).hosts ?? {}).length
      : 0;

    return {
      name,
      payload,
      rejected: !result.success,
      escaped: result.escaped,
      error: result.error ?? null,
      hostCount,
    };
  }

  /** Runs the whole hostile payload suite; every entry must be rejected. */
  runHostileSuite(): SandboxCheckResult[] {
    return HOSTILE_SCENARIO_PAYLOADS.map((entry) =>
      this.executeInSandbox(entry.name, entry.payload),
    );
  }

  validateScenarioJSON(
    scenarioId: string | null,
    json: string,
    state: CyberSimulationState | null,
  ): SecurityValidationReport {
    const sandbox = this.executeInSandbox(scenarioId ?? 'scenario', json);

    let policyViolations: SecuritySandboxViolation[] = [];
    try {
      policyViolations = SecuritySandboxPolicy.validateScenarioInput(JSON.parse(json));
    } catch {
      policyViolations = [{ path: 'scenario', message: 'Scenario JSON could not be parsed.' }];
    }

    const hostileChecks = this.runHostileSuite();
    const audit = this.runAudit(state, json);

    const report: SecurityValidationReport = {
      ranAt: Date.now(),
      scenarioId,
      sandbox,
      policyViolations,
      hostileChecks,
      audit,
      passed:
        sandbox.rejected === false &&
        sandbox.escaped === false &&
        policyViolations.length === 0 &&
        hostileChecks.every((check) => check.rejected && !check.escaped) &&
        (audit === null || audit.passed),
    };

    this.reports = [...this.reports, report].slice(-10);
    this.emit();
    return report;
  }

  /** Runs the engine security audit system over the live network + input. */
  runAudit(state: CyberSimulationState | null, inputValue: string): SecurityAuditReport | null {
    const networkGraph = SecurityService.buildNetworkGraph(state);

    const auditSystem = new SecurityAuditSystem({
      name: 'CYRE Studio Scenario Audit',
      configuration: { appName: 'CYRE Studio', version: '1.0.4', logLevel: 'info' },
      networkGraph,
      targets: state
        ? [
            { name: 'cyberSimulationState', value: state },
            { name: 'attacker', value: state.attacker },
          ]
        : [],
      inputValues: [{ name: 'scenarioJson', value: inputValue }],
    });

    return auditSystem.audit();
  }

  /**
   * Projects the live cyber state into the engine `NetworkGraph` so the
   * audit system can validate topology.
   */
  static buildNetworkGraph(state: CyberSimulationState | null): NetworkGraph | undefined {
    if (!state) return undefined;

    const graph = new NetworkGraph();
    for (const host of Object.values(state.hosts)) {
      graph.addNode(host.id, {
        name: host.name,
        type: host.type,
        metadata: { isolated: host.isolated, compromised: host.compromised },
      });
    }

    for (const log of state.monitoring.logs) {
      if (!log.target) continue;
      if (!state.hosts[log.source] || !state.hosts[log.target]) continue;
      if (graph.hasEdge(log.source, log.target)) continue;
      graph.addEdge(log.source, log.target, { type: 'connects', bidirectional: false });
    }

    return graph;
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}
