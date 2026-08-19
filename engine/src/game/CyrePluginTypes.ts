import type { CyreScript } from './CyreScript.js';
import type { ScenarioDefinition } from '../scenario/index.js';

export interface CyrePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly dependencies?: string[];
  activate(context: CyrePluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export interface CyrePluginContext {
  readonly pluginId: string;
  registerScript(script: CyreScript): void;
  registerMission(id: string, factory: () => ScenarioDefinition): void;
}

export type CyrePluginState = 'registered' | 'active' | 'inactive' | 'error';
