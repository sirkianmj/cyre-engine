import type { CyrePlugin, CyrePluginState } from './CyrePluginTypes.js';
import { CyrePluginContextImpl } from './CyrePluginContext.js';
import { CyrePluginRegistry } from './CyrePluginRegistry.js';
import { CyreScriptRegistry } from './CyreScriptRegistry.js';
import { CyreScript } from './CyreScript.js';
import type { ScenarioDefinition } from '../scenario/index.js';

export class CyrePluginSystem {
  private readonly pluginRegistry = new CyrePluginRegistry();
  private readonly scriptRegistry = new CyreScriptRegistry();
  private readonly missionRegistry = new Map<string, () => ScenarioDefinition>();
  private readonly contexts = new Map<string, CyrePluginContextImpl>();
  private readonly activationOrder: string[] = [];

  registerPlugin(plugin: CyrePlugin): void {
    this.pluginRegistry.register(plugin);
  }

  async activatePlugin(id: string): Promise<void> {
    const context = new CyrePluginContextImpl(
      id,
      this.scriptRegistry,
      this.missionRegistry,
    );

    this.contexts.set(id, context);

    try {
      await this.pluginRegistry.activate(id, context);
      this.activationOrder.push(id);
    } catch (error) {
      this.contexts.delete(id);
      throw error;
    }
  }

  async deactivatePlugin(id: string): Promise<void> {
    await this.pluginRegistry.deactivate(id);

    const context = this.contexts.get(id);
    if (context !== undefined) {
      context.unregisterAll();
      this.contexts.delete(id);
    }

    const orderIndex = this.activationOrder.indexOf(id);
    if (orderIndex >= 0) {
      this.activationOrder.splice(orderIndex, 1);
    }
  }

  async deactivateAll(): Promise<void> {
    const pluginsToDeactivate = [...this.activationOrder].reverse();
    for (const pluginId of pluginsToDeactivate) {
      await this.deactivatePlugin(pluginId);
    }
  }

  getPlugin(id: string): CyrePlugin | undefined {
    return this.pluginRegistry.get(id);
  }

  hasPlugin(id: string): boolean {
    return this.pluginRegistry.has(id);
  }

  listPlugins(): CyrePlugin[] {
    return this.pluginRegistry.list();
  }

  listActivePlugins(): CyrePlugin[] {
    return this.pluginRegistry.listActive();
  }

  getPluginState(id: string): CyrePluginState | undefined {
    return this.pluginRegistry.getState(id);
  }

  listPluginsByState(state: CyrePluginState): CyrePlugin[] {
    const validStates: readonly CyrePluginState[] = [
      'registered',
      'active',
      'inactive',
      'error',
    ];
    if (!validStates.includes(state)) {
      throw new Error(`Invalid plugin state "${state}".`);
    }
    return this.pluginRegistry
      .list()
      .filter((plugin) => this.pluginRegistry.getState(plugin.id) === state);
  }

  getScript(id: string): CyreScript | undefined {
    return this.scriptRegistry.get(id);
  }

  listScripts(): CyreScript[] {
    return this.scriptRegistry.list();
  }

  hasScript(id: string): boolean {
    return this.scriptRegistry.has(id);
  }

  hasMission(id: string): boolean {
    return this.missionRegistry.has(id);
  }

  createMission(id: string): ScenarioDefinition {
    const factory = this.missionRegistry.get(id);
    if (factory === undefined) {
      throw new Error(`Plugin mission "${id}" is not registered.`);
    }
    return factory();
  }

  listMissionIds(): string[] {
    return Array.from(this.missionRegistry.keys()).sort();
  }

  validate(): void {
    this.pluginRegistry.validate();
    this.scriptRegistry.validate();
  }
}
