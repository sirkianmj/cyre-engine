import {
  CYRE_ENGINE_VERSION,
  CYRE_PUBLIC_API_VERSION,
  PublicApiRegistry,
} from './PublicApiRegistry.js';

export interface GeneratedDocument {
  title: string;
  format: 'markdown';
  content: string;
  generatedAt: number;
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  core: 'Core engine lifecycle, configuration, logging, modules, entities, events, state, and clocks.',
  cyber: 'Cybersecurity simulation entities, network graphs, identity, permissions, vulnerabilities, attack and defense models.',
  game: 'Gameplay systems, missions, evidence, investigation, progression, scripting, plugins, agents, difficulty, and multiplayer.',
  scenario: 'Scenario representation, loading, validation, registry, editor, and procedural generation.',
  serialization: 'Project, scenario, and schema serialization primitives.',
  project: 'CYRE project model, templates, and lifecycle management.',
  scene: 'Scene model, registry, and editing support.',
  editor: 'Professional CYRE editor domain models, docking, inspectors, palettes, and graph editors.',
  debug: 'Debugger, inspector, profiling, diagnostics, and audit tooling.',
  timeline: 'Event timeline storage and querying.',
  replay: 'Simulation replay recording and playback.',
  analytics: 'Telemetry event recording and export.',
  automation: 'REST API, webhooks, WebSockets, n8n, and automation integration.',
  research: 'Research datasets, experimental scenario framework, reproducibility, and dashboards.',
  platform: 'Platform adapters, input, packaging, console architecture, audio, and compatibility audit.',
  ui: 'UI components, themes, design system, motion, game UI, visual polish, and UX audits.',
};

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export class DocumentationGenerator {
  readonly name: string;

  constructor(name = 'CYRE Documentation Generator') {
    if (!name || name.trim() === '') {
      throw new Error('DocumentationGenerator name is required.');
    }
    this.name = name;
  }

  generateApiReference(): string {
    const moduleNames = PublicApiRegistry.getModuleNames().sort();
    const lines: string[] = [];

    lines.push('# CYRE Public API Reference');
    lines.push('');
    lines.push(`Engine version: \`${CYRE_ENGINE_VERSION}\``);
    lines.push(`Public API version: \`${CYRE_PUBLIC_API_VERSION}\``);
    lines.push('');
    lines.push('## Modules');
    lines.push('');
    lines.push('| Module | Version | Exported Symbols |');
    lines.push('| --- | --- | --- |');

    for (const moduleName of moduleNames) {
      const version = PublicApiRegistry.getModuleVersion(moduleName) ?? 0;
      const symbols = PublicApiRegistry.getRuntimeSymbols(moduleName);
      const symbolCell = symbols.map(escapeMarkdownTableCell).join(', ');
      lines.push(
        `| \`${escapeMarkdownTableCell(moduleName)}\` | ${version} | ${symbolCell} |`,
      );
    }

    lines.push('');
    lines.push('## Module API');
    lines.push('');

    for (const moduleName of moduleNames) {
      const symbols = PublicApiRegistry.getRuntimeSymbols(moduleName);
      const description = MODULE_DESCRIPTIONS[moduleName] ?? 'No description available.';

      lines.push(`### ${moduleName}`);
      lines.push('');
      lines.push(description);
      lines.push('');
      if (symbols.length > 0) {
        lines.push('Exported symbols:');
        lines.push('');
        for (const symbol of symbols) {
          lines.push(`- \`${symbol}\``);
        }
        lines.push('');
      }
    }

    return `${lines.join('\n').trim()}\n`;
  }

  generateArchitectureOverview(): string {
    const moduleNames = PublicApiRegistry.getModuleNames().sort();
    const lines: string[] = [];

    lines.push('# CYRE Architecture Overview');
    lines.push('');
    lines.push('CYRE is a modular, domain-specific simulation and game engine for cybersecurity applications.');
    lines.push('');
    lines.push('## Module Boundaries');
    lines.push('');
    lines.push('| Module | Responsibility |');
    lines.push('| --- | --- |');

    for (const moduleName of moduleNames) {
      const description = MODULE_DESCRIPTIONS[moduleName] ?? 'No description available.';
      lines.push(
        `| \`${escapeMarkdownTableCell(moduleName)}\` | ${escapeMarkdownTableCell(description)} |`,
      );
    }

    lines.push('');
    lines.push('Cross-module imports must use public module indexes. Internal files must not be imported across module boundaries.');
    lines.push('');
    return `${lines.join('\n').trim()}\n`;
  }

  generatePackagesOverview(): string {
    const moduleNames = PublicApiRegistry.getModuleNames().sort();
    const lines: string[] = [];

    lines.push('# CYRE Package Inventory');
    lines.push('');
    lines.push('| Package | API Version |');
    lines.push('| --- | --- |');

    for (const moduleName of moduleNames) {
      const version = PublicApiRegistry.getModuleVersion(moduleName) ?? 0;
      lines.push(`| \`${escapeMarkdownTableCell(moduleName)}\` | ${version} |`);
    }

    lines.push('');
    return `${lines.join('\n').trim()}\n`;
  }

  generateBundle(now: number = Date.now()): GeneratedDocument {
    const sections = [
      '# CYRE Engine Documentation',
      '',
      'Generated by CYRE Documentation Generator.',
      '',
      this.generateApiReference(),
      this.generateArchitectureOverview(),
      this.generatePackagesOverview(),
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
      throw new Error('DocumentationGenerator name is required.');
    }
  }
}
