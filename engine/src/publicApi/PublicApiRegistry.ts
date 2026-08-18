export interface PublicApiModule {
  name: string;
  version: number;
  runtimeSymbols: string[];
}

export const PUBLIC_API_MODULES: PublicApiModule[] = [
  {
    name: 'core',
    version: 1,
    runtimeSymbols: [
      'Engine',
      'Configuration',
      'Logger',
      'ErrorHandler',
      'CyreError',
      'ModuleManager',
      'BaseModule',
      'Clock',
      'SystemClock',
      'ManualClock',
      'Entity',
      'EventBus',
      'StateContainer',
    ],
  },
  {
    name: 'cyber',
    version: 1,
    runtimeSymbols: [
      'CyberEntity',
      'Host',
      'Server',
      'Client',
      'Router',
      'Firewall',
      'Database',
      'Service',
      'User',
      'Account',
      'NetworkGraph',
      'Privilege',
      'Role',
      'Session',
      'AccessControl',
      'Vulnerability',
      'VulnerabilityCatalog',
      'AttackStage',
      'AttackState',
      'DefensiveAction',
      'DefenseState',
    ],
  },
  {
    name: 'game',
    version: 1,
    runtimeSymbols: [
      'Mission',
      'MissionStatus',
      'createObjective',
      'createEvidence',
      'EvidenceCollection',
      'AttackGraph',
      'Alert',
      'InvestigationState',
      'ScoreCalculator',
      'PlayerProgression',
      'Difficulty',
      'Campaign',
      'MissionRunner',
      'MissionFactory',
    ],
  },
  {
    name: 'scenario',
    version: 1,
    runtimeSymbols: [
      'ScenarioDefinition',
      'ScenarioLoader',
      'ScenarioRegistry',
      'ScenarioValidator',
      'ScenarioEditor',
    ],
  },
  {
    name: 'serialization',
    version: 1,
    runtimeSymbols: [
      'SchemaRegistry',
      'CyreSerializer',
      'ScenarioSerializer',
      'ProjectSerializer',
    ],
  },
  {
    name: 'project',
    version: 1,
    runtimeSymbols: ['ProjectModel', 'ProjectCreator', 'ProjectManager'],
  },
  {
    name: 'scene',
    version: 1,
    runtimeSymbols: ['SceneModel', 'SceneRegistry', 'SceneEditor'],
  },
  {
    name: 'editor',
    version: 1,
    runtimeSymbols: [
      'EditorShell',
      'DockManager',
      'WorkspaceManager',
      'CommandPalette',
      'ShortcutManager',
      'ProjectExplorer',
      'CyberEntityPalette',
      'Inspector',
      'MultiSelectionManager',
      'NetworkGraphEditor',
    ],
  },
  {
    name: 'debug',
    version: 1,
    runtimeSymbols: ['DebugInspector'],
  },
  {
    name: 'timeline',
    version: 1,
    runtimeSymbols: ['Timeline'],
  },
  {
    name: 'replay',
    version: 1,
    runtimeSymbols: ['ReplayRecorder', 'ReplayPlayer'],
  },
  {
    name: 'analytics',
    version: 1,
    runtimeSymbols: ['TelemetryRecorder', 'TelemetryExporter'],
  },
  {
    name: 'automation',
    version: 1,
    runtimeSymbols: ['AutomationServer', 'WebhookRegistry', 'N8nIntegration'],
  },
  {
    name: 'research',
    version: 1,
    runtimeSymbols: ['ResearchDataset'],
  },
  {
    name: 'platform',
    version: 1,
    runtimeSymbols: [
      'MemoryStorageAdapter',
      'FileStorageAdapter',
      'MobilePlatformAdapter',
      'DesktopPlatformAdapter',
      'ConsolePlatformAdapter',
      'TouchInputAdapter',
      'GamepadInputAdapter',
      'PerformanceProfile',
      'ResolutionSettings',
      'DesktopApp',
    ],
  },
  {
    name: 'ui',
    version: 1,
    runtimeSymbols: [
      'TerminalUI',
      'DashboardUI',
      'UIRenderer',
      'AccessibilitySettings',
      'FeedbackSystem',
      'OnboardingManager',
    ],
  },
];

export const CYRE_ENGINE_VERSION = '1.0.0';
export const CYRE_PUBLIC_API_VERSION = 1;

export class PublicApiRegistry {
  static getModuleNames(): string[] {
    return PUBLIC_API_MODULES.map((module) => module.name);
  }

  static getRuntimeSymbols(moduleName: string): string[] {
    const module = PUBLIC_API_MODULES.find((entry) => entry.name === moduleName);
    return module ? [...module.runtimeSymbols] : [];
  }

  static hasModule(moduleName: string): boolean {
    return PUBLIC_API_MODULES.some((module) => module.name === moduleName);
  }

  static getModuleVersion(moduleName: string): number | undefined {
    const module = PUBLIC_API_MODULES.find((entry) => entry.name === moduleName);
    return module?.version;
  }
}
