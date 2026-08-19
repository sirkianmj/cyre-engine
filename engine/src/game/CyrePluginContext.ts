import type { CyrePluginContext } from './CyrePluginTypes.js';
import { CyreScript } from './CyreScript.js';
import { CyreScriptRegistry } from './CyreScriptRegistry.js';
import type { ScenarioDefinition } from '../scenario/index.js';

export class CyrePluginContextImpl implements CyrePluginContext {
  readonly pluginId: string;
  private readonly scriptRegistry: CyreScriptRegistry;
  private readonly missionRegistry: Map<string, () => ScenarioDefinition>;
  private readonly scriptIds: string[] = [];
  private readonly missionIds: string[] = [];

  constructor(
    pluginId: string,
    scriptRegistry: CyreScriptRegistry,
    missionRegistry: Map<string, () => ScenarioDefinition>,
  ) {
    this.pluginId = pluginId;
    this.scriptRegistry = scriptRegistry;
    this.missionRegistry = missionRegistry;
  }

  registerScript(script: CyreScript): void {
    this.scriptRegistry.register(script);
    this.scriptIds.push(script.getId());
  }

  registerMission(id: string, factory: () => ScenarioDefinition): void {
    if (!id || id.trim() === '') {
      throw new Error('Plugin mission id is required.');
    }
    if (typeof factory !== 'function') {
      throw new Error('Plugin mission factory must be a function.');
    }
    if (this.missionRegistry.has(id)) {
      throw new Error(`Plugin mission "${id}" is already registered.`);
    }
    this.missionRegistry.set(id, factory);
    this.missionIds.push(id);
  }

  getRegisteredScriptIds(): readonly string[] {
    return [...this.scriptIds];
  }

  getRegisteredMissionIds(): readonly string[] {
    return [...this.missionIds];
  }

  unregisterAll(): void {
    for (const scriptId of this.scriptIds) {
      if (this.scriptRegistry.has(scriptId)) {
        this.scriptRegistry.unregister(scriptId);
      }
    }
    for (const missionId of this.missionIds) {
      this.missionRegistry.delete(missionId);
    }
    this.scriptIds.length = 0;
    this.missionIds.length = 0;
  }
}
