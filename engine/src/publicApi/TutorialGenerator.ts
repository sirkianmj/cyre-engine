import {
  CYRE_ENGINE_VERSION,
  PublicApiRegistry,
} from './PublicApiRegistry.js';

export interface GeneratedTutorial {
  id: string;
  title: string;
  format: 'markdown';
  content: string;
}

interface TutorialDefinition {
  id: string;
  title: string;
  content: string;
}

function codeBlock(language: string, code: string): string {
  return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
}

const TUTORIALS: TutorialDefinition[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with CYRE Core',
    content: `
# Getting Started with CYRE Core

This tutorial demonstrates how to configure and run a CYRE engine instance.

## 1. Create an Engine

${codeBlock('typescript', `
import { Engine } from '@cyre/engine';

const engine = new Engine({
  appName: 'My Cyber Game',
  version: '1.0.0',
  logLevel: 'info',
});

await engine.initialize();
await engine.start();
await engine.stop();
await engine.shutdown();
`)}

## 2. Register a Module

${codeBlock('typescript', `
import type { CyreModule, EngineContext } from '@cyre/engine';

const myModule: CyreModule = {
  name: 'my-module',
  dependencies: ['core'],
  async initialize(ctx: EngineContext) {
    ctx.logger.info('Initializing my module');
  },
  async start() {
    console.log('Module started');
  },
};

engine.registerModule(myModule);
`)}
`,
  },
  {
    id: 'network-graph',
    title: 'Building a Cyber Network',
    content: `
# Building a Cyber Network

CYRE models networks as a graph of hosts, servers, and security devices.

## Create a Network

${codeBlock('typescript', `
import { NetworkGraph } from '@cyre/engine';

const network = new NetworkGraph();

network.addNode('internet', { type: 'internet' });
network.addNode('firewall', { type: 'firewall' });
network.addNode('workstation', { type: 'client' });
network.addNode('database', { type: 'server' });

network.addEdge('internet', 'firewall', { bidirectional: false });
network.addEdge('firewall', 'workstation', { bidirectional: false });
network.addEdge('workstation', 'database', { bidirectional: false });
`)}

## Check Attack Paths

${codeBlock('typescript', `
const path = network.shortestPath('internet', 'database');

if (!path) {
  throw new Error('No attack path found.');
}

console.log(path.path);
// ['internet', 'firewall', 'workstation', 'database']
`)}
`,
  },
  {
    id: 'scenario-authoring',
    title: 'Authoring a Scenario',
    content: `
# Authoring a Scenario

Scenarios describe an organization, network, attacker, evidence, and objectives.

## Use ScenarioEditor

${codeBlock('typescript', `
import { ScenarioEditor } from '@cyre/engine';

const scenario = new ScenarioEditor()
  .setId('incident-001')
  .setName('Compromised Workstation')
  .setOrganization('Example Corp', 'Technology')
  .addNetworkNode('internet', 'internet')
  .addNetworkNode('vpn', 'firewall')
  .addNetworkNode('workstation', 'client')
  .addNetworkNode('database', 'server')
  .addNetworkEdge('internet', 'vpn')
  .addNetworkEdge('vpn', 'workstation')
  .addNetworkEdge('workstation', 'database')
  .setAttacker('apt-1', 'APT Group', 'Exfiltrate data', 'advanced')
  .setDefense(['firewall', 'siem'], 'basic')
  .setAttackPath('internet', 'database', ['internet', 'vpn', 'workstation', 'database'])
  .addEvidence('ev-1', 'authentication_event', 'VPN login', 'Unusual VPN login detected.')
  .addObjective('obj-1', 'Identify the compromised workstation.')
  .setTimeLimit(600000)
  .setSeed(42);

const definition = scenario.build();
`)}

## Validate the Scenario

${codeBlock('typescript', `
import { ScenarioValidator } from '@cyre/engine';

const validation = new ScenarioValidator().validate(definition.getData());

if (!validation.isValid) {
  throw new Error(validation.errors.join('\\n'));
}
`)}
`,
  },
  {
    id: 'running-mission-001',
    title: 'Running Mission 001',
    content: `
# Running Mission 001

CYRE includes built-in missions registered through MissionFactory.

## Create a MissionRunner

${codeBlock('typescript', `
import {
  createMission001Scenario,
  MissionRunner,
} from '@cyre/engine';

const scenario = createMission001Scenario();
const runner = new MissionRunner(scenario);

runner.start();
runner.acknowledgeAlert();
`)}

## Investigate and Contain

${codeBlock('typescript', `
runner.formHypothesis('Employee credentials were compromised via VPN');
runner.identifyAttackPath('internet', 'database');
runner.containIncident();
runner.recoverIncident();
`)}

## Complete the Mission

${codeBlock('typescript', `
const metrics = runner.completeMission();

if (runner.getMissionStatus() !== 'completed') {
  throw new Error('Mission was not completed.');
}

console.log(metrics);
`)}
`,
  },
  {
    id: 'autonomous-agents',
    title: 'Using Autonomous Cyber Agents',
    content: `
# Using Autonomous Cyber Agents

CYRE provides attacker and defender agents for simulation.

## Create an Attacker Agent

${codeBlock('typescript', `
import { AutonomousAttackerAgent, AttackStage } from '@cyre/engine';

const attacker = new AutonomousAttackerAgent({
  id: 'attacker-1',
  name: 'Scripted Attacker',
  attackPath: ['internet', 'vpn', 'workstation', 'database'],
  initialStage: AttackStage.Recon,
});
`)}

## Create a Defender Agent

${codeBlock('typescript', `
import { AutonomousDefenderAgent, DefensiveAction } from '@cyre/engine';

const defender = new AutonomousDefenderAgent({
  id: 'defender-1',
  name: 'Automated Defender',
  actions: [
    DefensiveAction.Detect,
    DefensiveAction.Alert,
    DefensiveAction.Isolate,
  ],
  targetId: 'workstation',
});
`)}

## Register Agents

${codeBlock('typescript', `
import { CyberAgentRegistry } from '@cyre/engine';

const registry = new CyberAgentRegistry();
registry.register(attacker);
registry.register(defender);

console.log(registry.listByRole('attacker'));
console.log(registry.listByRole('defender'));
`)}
`,
  },
  {
    id: 'automation-integration',
    title: 'Integrating Automation and Webhooks',
    content: `
# Integrating Automation and Webhooks

CYRE can send security events to n8n and custom webhooks.

## Create an Automation Server

${codeBlock('typescript', `
import { AutomationServer } from '@cyre/engine';

const server = new AutomationServer();
await server.start(0);
await server.stop();
`)}

## Register and Dispatch a Webhook

${codeBlock('typescript', `
import { WebhookSystem } from '@cyre/engine';

const system = new WebhookSystem();

system.registerEndpoint({
  id: 'n8n',
  url: 'https://n8n.example.com/webhook/cyre',
  allowedTypes: ['incident_detected'],
});

await system.dispatchEvent({
  type: 'incident_detected',
  timestamp: Date.now(),
  source: 'siem',
  data: { severity: 'high' },
});
`)}

## Filter n8n Events

${codeBlock('typescript', `
import { N8nIntegration } from '@cyre/engine';

const n8n = new N8nIntegration(
  'https://n8n.example.com/webhook/cyre',
  ['incident_detected'],
);

await n8n.sendEvent({
  type: 'incident_detected',
  timestamp: Date.now(),
});
`)}
`,
  },
  {
    id: 'platform-compatibility',
    title: 'Auditing Platform Compatibility',
    content: `
# Auditing Platform Compatibility

Use the compatibility audit system to validate platform adapters.

## Prepare Platform Adapters

${codeBlock('typescript', `
import {
  MemoryStorageAdapter,
  MobilePlatformAdapter,
  ResolutionSettings,
  PerformanceProfile,
  CompatibilityAuditSystem,
} from '@cyre/engine';

const adapter = new MobilePlatformAdapter();

const audit = new CompatibilityAuditSystem({
  adapters: [adapter],
  performanceProfiles: [PerformanceProfile.Medium],
  resolutionSettings: new ResolutionSettings({
    width: 1920,
    height: 1080,
  }),
  supportedPlatformTargets: ['web', 'mobile'],
});
`)}

## Run the Audit

${codeBlock('typescript', `
const report = audit.audit();

console.log(report.summary);

if (!report.passed) {
  for (const issue of report.issues) {
    console.error(\`[\${issue.severity}] \${issue.message}\`);
  }
}
`)}
`,
  },
];

export class TutorialGenerator {
  readonly name: string;

  constructor(name = 'CYRE Tutorial Generator') {
    if (!name || name.trim() === '') {
      throw new Error('TutorialGenerator name is required.');
    }
    this.name = name;
  }

  listTutorialIds(): string[] {
    return TUTORIALS.map((tutorial) => tutorial.id);
  }

  generateTutorial(id: string): GeneratedTutorial {
    const tutorial = TUTORIALS.find((entry) => entry.id === id);
    if (!tutorial) {
      throw new Error(`Tutorial "${id}" does not exist.`);
    }

    return {
      id: tutorial.id,
      title: tutorial.title,
      format: 'markdown',
      content: tutorial.content.trim() + '\n',
    };
  }

  generateAll(): GeneratedTutorial[] {
    return TUTORIALS.map((tutorial) => this.generateTutorial(tutorial.id));
  }

  generateTutorialsIndex(): string {
    const lines: string[] = [];

    lines.push('# CYRE Tutorials');
    lines.push('');
    lines.push(`Engine version: \`${CYRE_ENGINE_VERSION}\``);
    lines.push('');

    for (const tutorial of TUTORIALS) {
      lines.push(`- [${tutorial.title}](#${tutorial.id})`);
    }

    lines.push('');
    return `${lines.join('\n').trim()}\n`;
  }

  generateBundle(now: number = Date.now()): {
    title: string;
    format: 'markdown';
    content: string;
    generatedAt: number;
  } {
    const sections = [
      '# CYRE Tutorial Documentation',
      '',
      this.generateTutorialsIndex(),
      ...this.generateAll().map((tutorial) => tutorial.content),
    ];

    return {
      title: this.name,
      format: 'markdown',
      content: sections.join('\n').trim() + '\n',
      generatedAt: now,
    };
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('TutorialGenerator name is required.');
    }

    if (TUTORIALS.length === 0) {
      throw new Error('TutorialGenerator has no tutorials.');
    }

    const ids = new Set<string>();
    for (const tutorial of TUTORIALS) {
      if (ids.has(tutorial.id)) {
        throw new Error(`Duplicate tutorial id "${tutorial.id}".`);
      }
      ids.add(tutorial.id);
    }
  }
}
