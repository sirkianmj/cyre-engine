import type {
  CyrePlugin,
  CyrePluginContext,
  CyrePluginState,
} from './CyrePluginTypes.js';

interface CyrePluginEntry {
  plugin: CyrePlugin;
  state: CyrePluginState;
}

const VALID_PLUGIN_STATES: readonly CyrePluginState[] = [
  'registered',
  'active',
  'inactive',
  'error',
];

export class CyrePluginRegistry {
  private entries: Map<string, CyrePluginEntry> = new Map();

  register(plugin: CyrePlugin): void {
    this.validatePlugin(plugin);
    if (this.entries.has(plugin.id)) {
      throw new Error(`CyrePlugin "${plugin.id}" is already registered.`);
    }

    if (plugin.dependencies !== undefined) {
      this.validateDependencyList(plugin.dependencies);
      for (const dependencyId of plugin.dependencies) {
        if (!this.entries.has(dependencyId)) {
          throw new Error(
            `CyrePlugin "${plugin.id}" depends on missing plugin "${dependencyId}".`,
          );
        }
      }
    }

    this.entries.set(plugin.id, {
      plugin,
      state: 'registered',
    });
  }

  unregister(id: string): void {
    this.ensureExists(id);
    const entry = this.entries.get(id)!;
    if (entry.state === 'active') {
      throw new Error(`Cannot unregister active plugin "${id}".`);
    }

    const dependents = this.list().filter((plugin) =>
      plugin.dependencies?.includes(id),
    );
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister plugin "${id}" because it is a dependency of: ${dependents
          .map((plugin) => plugin.id)
          .join(', ')}.`,
      );
    }

    this.entries.delete(id);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): CyrePlugin | undefined {
    return this.entries.get(id)?.plugin;
  }

  getState(id: string): CyrePluginState | undefined {
    return this.entries.get(id)?.state;
  }

  list(): CyrePlugin[] {
    return Array.from(this.entries.values()).map((entry) => entry.plugin);
  }

  listIds(): string[] {
    return Array.from(this.entries.keys()).sort();
  }

  listActive(): CyrePlugin[] {
    return Array.from(this.entries.values())
      .filter((entry) => entry.state === 'active')
      .map((entry) => entry.plugin);
  }

  async activate(id: string, context: CyrePluginContext): Promise<void> {
    this.ensureExists(id);
    const entry = this.entries.get(id)!;

    if (entry.state === 'active') {
      throw new Error(`CyrePlugin "${id}" is already active.`);
    }

    if (entry.plugin.dependencies !== undefined) {
      for (const dependencyId of entry.plugin.dependencies) {
        const dependencyState = this.getState(dependencyId);
        if (dependencyState !== 'active') {
          throw new Error(
            `Cannot activate plugin "${id}" because dependency "${dependencyId}" is not active.`,
          );
        }
      }
    }

    try {
      await entry.plugin.activate(context);
      entry.state = 'active';
    } catch (error) {
      entry.state = 'error';
      throw error;
    }
  }

  async deactivate(id: string): Promise<void> {
    this.ensureExists(id);
    const entry = this.entries.get(id)!;

    if (entry.state !== 'active' && entry.state !== 'error') {
      throw new Error(`CyrePlugin "${id}" is not active.`);
    }

    if (entry.plugin.deactivate !== undefined) {
      await entry.plugin.deactivate();
    }

    entry.state = 'inactive';
  }

  validate(): void {
    for (const [id, entry] of this.entries.entries()) {
      this.validatePlugin(entry.plugin);
      if (!VALID_PLUGIN_STATES.includes(entry.state)) {
        throw new Error(`Invalid plugin state "${entry.state}" for plugin "${id}".`);
      }
      if (entry.plugin.dependencies !== undefined) {
        this.validateDependencyList(entry.plugin.dependencies);
        for (const dependencyId of entry.plugin.dependencies) {
          if (!this.entries.has(dependencyId)) {
            throw new Error(`Plugin "${id}" depends on missing plugin "${dependencyId}".`);
          }
        }
      }
    }
  }

  private ensureExists(id: string): void {
    if (!this.entries.has(id)) {
      throw new Error(`CyrePlugin "${id}" does not exist.`);
    }
  }

  private validatePlugin(plugin: CyrePlugin): void {
    if (!plugin.id || plugin.id.trim() === '') {
      throw new Error('CyrePlugin id is required.');
    }
    if (!plugin.name || plugin.name.trim() === '') {
      throw new Error('CyrePlugin name is required.');
    }
    if (!plugin.version || plugin.version.trim() === '') {
      throw new Error('CyrePlugin version is required.');
    }
    if (typeof plugin.activate !== 'function') {
      throw new Error('CyrePlugin activate must be a function.');
    }
    if (plugin.deactivate !== undefined && typeof plugin.deactivate !== 'function') {
      throw new Error('CyrePlugin deactivate must be a function if provided.');
    }
  }

  private validateDependencyList(dependencies: string[]): void {
    if (!Array.isArray(dependencies)) {
      throw new Error('CyrePlugin dependencies must be an array.');
    }
    const seen = new Set<string>();
    for (const dependency of dependencies) {
      if (typeof dependency !== 'string' || dependency.trim() === '') {
        throw new Error('CyrePlugin dependencies must contain non-empty strings.');
      }
      if (seen.has(dependency)) {
        throw new Error(`CyrePlugin dependency "${dependency}" is duplicated.`);
      }
      seen.add(dependency);
    }
  }
}
