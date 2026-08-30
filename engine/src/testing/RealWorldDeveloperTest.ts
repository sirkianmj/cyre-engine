import {
  ScenarioDefinition,
  ScenarioEditor,
  ScenarioValidator,
} from '../scenario/index.js';
import { TestHarness } from './TestHarness.js';
import { DeterminismChecker } from './DeterminismChecker.js';
import { ReliabilityChecker } from './ReliabilityChecker.js';

export type RealWorldDeveloperStepStatus = 'passed' | 'failed';

export interface RealWorldDeveloperStepResult {
  name: string;
  status: RealWorldDeveloperStepStatus;
  durationMs: number;
  error?: string;
}

export interface RealWorldDeveloperTestReport {
  name: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  passed: boolean;
  steps: RealWorldDeveloperStepResult[];
  summary: string;
}

export type RealWorldDeveloperStepFn = () => void | Promise<void>;

export interface RealWorldDeveloperStep {
  name: string;
  run: RealWorldDeveloperStepFn;
}

export interface RealWorldDeveloperTestOptions {
  now?: () => number;
}

export class RealWorldDeveloperTest {
  private readonly name: string;
  private readonly steps = new Map<string, RealWorldDeveloperStep>();
  private readonly nowFn: () => number;

  constructor(
    name = 'CYRE Real-World Developer Test',
    options: RealWorldDeveloperTestOptions = {},
  ) {
    if (!name || name.trim() === '') {
      throw new Error('RealWorldDeveloperTest name is required.');
    }

    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('RealWorldDeveloperTest now must be a function if provided.');
    }

    this.name = name.trim();
    this.nowFn = options.now ?? (() => Date.now());
  }

  static createDefault(name = 'CYRE Real-World Developer Test'): RealWorldDeveloperTest {
    const test = new RealWorldDeveloperTest(name);
    test.registerDefaultSteps();
    return test;
  }

  addStep(name: string, run: RealWorldDeveloperStepFn): void {
    if (!name || name.trim() === '') {
      throw new Error('Real-world developer step name is required.');
    }

    const trimmedName = name.trim();
    if (this.steps.has(trimmedName)) {
      throw new Error(`Real-world developer step "${trimmedName}" is already registered.`);
    }

    if (typeof run !== 'function') {
      throw new Error(
        `Real-world developer step "${trimmedName}" must provide a function.`,
      );
    }

    this.steps.set(trimmedName, { name: trimmedName, run });
  }

  hasStep(name: string): boolean {
    return this.steps.has(name.trim());
  }

  removeStep(name: string): boolean {
    return this.steps.delete(name.trim());
  }

  clear(): void {
    this.steps.clear();
  }

  listStepNames(): string[] {
    return [...this.steps.keys()];
  }

  count(): number {
    return this.steps.size;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('RealWorldDeveloperTest name is required.');
    }

    if (this.steps.size === 0) {
      throw new Error(
        `RealWorldDeveloperTest "${this.name}" must contain at least one developer step.`,
      );
    }

    const seen = new Set<string>();
    for (const stepName of this.steps.keys()) {
      if (seen.has(stepName)) {
        throw new Error(`Duplicate real-world developer step "${stepName}".`);
      }
      seen.add(stepName);
    }
  }

  async run(): Promise<RealWorldDeveloperTestReport> {
    this.validate();

    const startedAt = this.nowFn();
    const results: RealWorldDeveloperStepResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const stepEntry of this.steps.values()) {
      const stepStartedAt = this.nowFn();

      try {
        await stepEntry.run();
        const stepEndedAt = this.nowFn();
        results.push({
          name: stepEntry.name,
          status: 'passed',
          durationMs: Math.max(0, stepEndedAt - stepStartedAt),
        });
        passedCount += 1;
      } catch (error) {
        const stepEndedAt = this.nowFn();
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          name: stepEntry.name,
          status: 'failed',
          durationMs: Math.max(0, stepEndedAt - stepStartedAt),
          error: message,
        });
        failedCount += 1;
      }
    }

    const endedAt = this.nowFn();
    const totalDurationMs = Math.max(0, endedAt - startedAt);
    const passed = failedCount === 0;
    const summary = [
      this.name,
      `${results.length} total`,
      `${passedCount} passed`,
      `${failedCount} failed`,
      `passed=${passed}`,
    ].join(' | ');

    return {
      name: this.name,
      totalSteps: results.length,
      passedSteps: passedCount,
      failedSteps: failedCount,
      durationMs: totalDurationMs,
      passed,
      steps: results,
      summary,
    };
  }

  private registerDefaultSteps(): void {
    this.addStep('build a representative cyber scenario', () => {
      const scenario = createDeveloperTestScenario();
      const result = new ScenarioValidator().validate(scenario.toJSON());

      if (!result.isValid) {
        throw new Error(`Scenario validation failed: ${result.errors.join(', ')}`);
      }
    });

    this.addStep('verify scenario creation is deterministic', () => {
      DeterminismChecker.expectDeterministic(
        () => createDeveloperTestScenario().toJSON(),
        5,
      );
    });

    this.addStep('load the scenario into the CYRE engine', async () => {
      const scenario = createDeveloperTestScenario();
      const harness = await TestHarness.createWithScenario(scenario.toJSON(), 0);

      try {
        if (harness.scenario.getId() !== scenario.getId()) {
          throw new Error('Loaded scenario id does not match the source scenario.');
        }

        if (harness.clock.now() !== 0) {
          throw new Error('Engine clock did not start at the expected time.');
        }
      } finally {
        await harness.engine.stop();
        await harness.engine.shutdown();
      }
    });

    this.addStep('verify scenario validation is reliable', () => {
      const reliabilityChecker = new ReliabilityChecker(
        'Real-World Developer Scenario Reliability',
      );

      reliabilityChecker.expectReliable(
        () => {
          const scenario = createDeveloperTestScenario();
          const result = new ScenarioValidator().validate(scenario.toJSON());

          if (!result.isValid) {
            throw new Error(`Validation failed: ${result.errors.join(', ')}`);
          }

          return result.isValid;
        },
        { runs: 5 },
      );
    });
  }
}

function createDeveloperTestScenario(): ScenarioDefinition {
  return new ScenarioEditor()
    .setId('real-world-dev-test')
    .setName('Developer Test Incident')
    .setDescription(
      'A representative first cyber incident used to validate the CYRE developer workflow.',
    )
    .setOrganization('DevSecOps Labs', 'Technology')
    .addNetworkNode('internet', 'internet')
    .addNetworkNode('edge-firewall', 'firewall')
    .addNetworkNode('workstation-01', 'client')
    .addNetworkNode('identity-server', 'server')
    .addNetworkNode('data-warehouse', 'server')
    .addNetworkEdge('internet', 'edge-firewall')
    .addNetworkEdge('edge-firewall', 'workstation-01')
    .addNetworkEdge('workstation-01', 'identity-server')
    .addNetworkEdge('identity-server', 'data-warehouse')
    .addAsset('asset-dw', 'Customer Data Warehouse', 'database', 100)
    .addUser('user-dev', 'Developer One', {
      email: 'developer@example.com',
      role: 'developer',
    })
    .setAttacker('attacker-demo', 'Demo Threat Actor', 'Exfiltrate customer data', 'low')
    .setDefense(['edge-firewall', 'siem'], 'basic')
    .setAttackPath(
      'internet',
      'data-warehouse',
      [
        'internet',
        'edge-firewall',
        'workstation-01',
        'identity-server',
        'data-warehouse',
      ],
    )
    .addEvidence(
      'ev-001',
      'authentication_event',
      'Suspicious authentication',
      'Unusual authentication activity observed at the edge firewall.',
      { sourceId: 'edge-firewall', timestamp: 100 },
    )
    .addEvidence(
      'ev-002',
      'network_record',
      'Lateral movement',
      'Connection from workstation to identity server.',
      { sourceId: 'workstation-01', timestamp: 140 },
    )
    .addEvidence(
      'ev-003',
      'network_record',
      'Data access',
      'Connection from identity server to data warehouse.',
      { sourceId: 'identity-server', timestamp: 180 },
    )
    .addObjective('obj-001', 'Identify the compromised workstation.')
    .addObjective('obj-002', 'Trace the attack path to the data warehouse.')
    .addObjective('obj-003', 'Contain the incident and protect customer data.')
    .addTimelineEvent('tl-001', 'alert', 100, { sourceId: 'edge-firewall' })
    .addTimelineEvent('tl-002', 'lateral_movement', 140, {
      sourceId: 'workstation-01',
      targetId: 'identity-server',
    })
    .addTimelineEvent('tl-003', 'data_access', 180, {
      sourceId: 'identity-server',
      targetId: 'data-warehouse',
    })
    .setTimeLimit(600000)
    .setSeed(2026)
    .build();
}
