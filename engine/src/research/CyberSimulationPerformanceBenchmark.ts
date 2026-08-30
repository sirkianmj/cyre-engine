import { CyberSimulation } from '../cyber/simulation/index.js';
import { CyberScenarioSimulation } from '../cyber/index.js';

export interface CyberSimulationBenchmarkResult {
  iterations: number;
  durationMs: number;
  operationsPerSecond: number;
  completed: boolean;
}

export function runCyberSimulationBenchmark(
  iterations = 200,
): CyberSimulationBenchmarkResult {
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error('Benchmark iterations must be a positive integer.');
  }

  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    const sim = new CyberSimulation(index + 1);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();
  }

  const durationMs = performance.now() - start;

  return {
    iterations,
    durationMs,
    operationsPerSecond: Math.round((iterations / durationMs) * 1000),
    completed: true,
  };
}

export interface LargeNetworkBenchmarkResult {
  hostCount: number;
  durationMs: number;
  initialized: boolean;
}

export function runLargeCyberNetworkBenchmark(
  hostCount = 1000,
): LargeNetworkBenchmarkResult {
  if (!Number.isInteger(hostCount) || hostCount <= 0) {
    throw new Error('Host count must be a positive integer.');
  }

  const start = performance.now();

  const scenario = {
    id: 'large-benchmark',
    name: 'Large Benchmark Network',
    description: 'Synthetic large network for performance testing.',
    seed: 1,
    targetHostId: `host-${hostCount - 1}`,
    nodes: Array.from({ length: hostCount }, (_, index) => ({
      id: `host-${index}`,
      name: `Host ${index}`,
      type: index % 3 === 0 ? 'web_server' : index % 3 === 1 ? 'database_server' : 'admin_workstation',
    })),
    connectionLogs: [],
  };

  const sim = new CyberScenarioSimulation(scenario as any);
  sim.initialize();
  const state = sim.getState();

  const durationMs = performance.now() - start;

  return {
    hostCount,
    durationMs,
    initialized: Object.keys(state.hosts).length === hostCount,
  };
}
