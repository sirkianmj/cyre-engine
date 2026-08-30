import { runCyberSimulationBenchmark, runLargeCyberNetworkBenchmark } from '../dist/research/index.js';
import { ApiStabilityPolicy } from '../dist/publicApi/index.js';

const iterations = Number(process.env.CYRE_BENCH_ITERATIONS ?? 200);
const hostCount = Number(process.env.CYRE_BENCH_HOSTS ?? 1000);
const result = runCyberSimulationBenchmark(iterations);

const report = {
  generatedAt: new Date().toISOString(),
  engineVersion: '1.0.4',
  benchmark: result,
  largeNetworkBenchmark: runLargeCyberNetworkBenchmark(hostCount),
  apiCompatibility: {
    from: '1.0.0',
    to: '1.0.4',
    backwardCompatible: ApiStabilityPolicy.isBackwardCompatible('1.0.0', '1.0.4'),
  },
  scenarioCatalog: {
    count: 3,
    ids: ['lab-basic', 'fintech', 'healthcare'],
  },
};

console.log(JSON.stringify(report, null, 2));
