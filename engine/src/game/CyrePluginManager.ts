import { CyrePluginSystem } from './CyrePluginSystem.js';
import type { CyrePlugin, CyrePluginState } from './CyrePluginTypes.js';

export interface CyrePluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  dependencies: readonly string[];
  state: CyrePluginState;
  active: boolean;
}

const VALID_STATES: readonly CyrePluginState[] = [
  'registered',
  'active',
  'inactive',
  'error',
];

export class CyrePluginManager {
  private readonly system = new CyrePluginSystem();

  registerPlugin(plugin: CyrePlugin): void {
    this.system.registerPlugin(plugin);
  }

  async enable(id: string): Promise<void> {
    await this.system.activatePlugin(id);
  }

  async disable(id: string): Promise<void> {
    await this.system.deactivatePlugin(id);
  }

  async enableAll(): Promise<void> {
    const activeIds = new Set(this.system.listActivePlugins().map((plugin) => plugin.id));
    const remainingIds = new Set(
      this.system
        .listPlugins()
        .map((plugin) => plugin.id)
        .filter((id) => !activeIds.has(id)),
    );

    while (remainingIds.size > 0) {
      let progressed = false;

      for (const id of Array.from(remainingIds)) {
        const plugin = this.system.getPlugin(id);
        if (plugin === undefined) {
          throw new Error(`Plugin "${id}" disappeared during enableAll.`);
        }

        const dependencies = plugin.dependencies ?? [];
        if (dependencies.every((dependencyId) => activeIds.has(dependencyId))) {
          await this.system.activatePlugin(id);
          activeIds.add(id);
          remainingIds.delete(id);
          progressed = true;
        }
      }

      if (!progressed) {
        throw new Error(
          'Unable to enable all plugins due to unsatisfied dependencies or circular dependency.',
        );
      }
    }
  }

  async disableAll(): Promise<void> {
    await this.system.deactivateAll();
  }

  getPlugin(id: string): CyrePlugin | undefined {
    return this.system.getPlugin(id);
  }

  hasPlugin(id: string): boolean {
    return this.system.hasPlugin(id);
  }

  listPlugins(): CyrePlugin[] {
    return this.system.listPlugins();
  }

  listActivePlugins(): CyrePlugin[] {
    return this.system.listActivePlugins();
  }

  listInactivePlugins(): CyrePlugin[] {
    return this.system.listPluginsByState('inactive');
  }

  listErrorPlugins(): CyrePlugin[] {
    return this.system.listPluginsByState('error');
  }

  listPluginsByState(state: CyrePluginState): CyrePlugin[] {
    if (!VALID_STATES.includes(state)) {
      throw new Error(`Invalid plugin state "${state}".`);
    }
    return this.system.listPluginsByState(state);
  }

  getPluginState(id: string): CyrePluginState | undefined {
    return this.system.getPluginState(id);
  }

  isActive(id: string): boolean {
    return this.system.getPluginState(id) === 'active';
  }

  getPluginInfo(id: string): CyrePluginInfo | undefined {
    const plugin = this.system.getPlugin(id);
    if (plugin === undefined) return undefined;

    const state = this.system.getPluginState(id);
    if (state === undefined) return undefined;

    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      dependencies: [...(plugin.dependencies ?? [])],
      state,
      active: state === 'active',
    };
  }

  listPluginInfos(): CyrePluginInfo[] {
    return this.system
      .listPlugins()
      .map((plugin) => this.getPluginInfo(plugin.id))
      .filter((info): info is CyrePluginInfo => info !== undefined)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  listScripts() {
    return this.system.listScripts();
  }

  hasScript(id: string): boolean {
    return this.system.hasScript(id);
  }

  listMissionIds(): string[] {
    return this.system.listMissionIds();
  }

  hasMission(id: string): boolean {
    return this.system.hasMission(id);
  }

  validate(): void {
    this.system.validate();
  }
}
