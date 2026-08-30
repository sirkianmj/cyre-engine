/**
 * CYRE Core Module Manager
 * --------------------------
 * Manages engine modules: registration, initialization, and lifecycle.
 * Supports optional module dependencies and topological ordering.
 */

import type { CyreModule, EngineContext } from './types.js';

export class ModuleManager {
  private modules: Map<string, CyreModule> = new Map();
  private initialized = false;
  private started = false;
  private stopped = false;

  register(module: CyreModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module with name "${module.name}" is already registered.`);
    }
    if (typeof module.initialize !== 'function') {
      throw new Error(`Module "${module.name}" must implement initialize(ctx).`);
    }
    this.modules.set(module.name, module);
  }

  /**
   * Validates that all dependencies are present and that there are no cycles.
   * Throws if validation fails.
   */
  validateDependencies(): void {
    const names = new Set(this.modules.keys());

    // Check missing dependencies
    for (const module of this.modules.values()) {
      if (module.dependencies) {
        for (const dep of module.dependencies) {
          if (!names.has(dep)) {
            throw new Error(
              `Module "${module.name}" depends on missing module "${dep}".`,
            );
          }
        }
      }
    }

    // Check cycles using depth-first search
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string, stack: string[]): void => {
      if (visiting.has(name)) {
        throw new Error(`Circular module dependency detected: ${stack.join(' -> ')} -> ${name}`);
      }
      if (visited.has(name)) return;

      visiting.add(name);
      const module = this.modules.get(name)!;
      if (module.dependencies) {
        for (const dep of module.dependencies) {
          visit(dep, [...stack, dep]);
        }
      }
      visiting.delete(name);
      visited.add(name);
    };

    for (const name of names) {
      visit(name, [name]);
    }
  }

  /**
   * Returns modules in dependency order (topological sort).
   * If no dependencies, returns registration order.
   */
  private getModulesInDependencyOrder(): CyreModule[] {
    const names = Array.from(this.modules.keys());
    const indegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const name of names) {
      indegree.set(name, 0);
      adjacency.set(name, []);
    }

    for (const module of this.modules.values()) {
      if (module.dependencies) {
        for (const dep of module.dependencies) {
          adjacency.get(dep)!.push(module.name);
          indegree.set(module.name, indegree.get(module.name)! + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const name of names) {
      if (indegree.get(name) === 0) {
        queue.push(name);
      }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const next of adjacency.get(current)!) {
        indegree.set(next, indegree.get(next)! - 1);
        if (indegree.get(next) === 0) {
          queue.push(next);
        }
      }
    }

    if (sorted.length !== names.length) {
      // This should never happen if validateDependencies was called
      throw new Error('Module dependency graph contains a cycle.');
    }

    return sorted.map((name) => this.modules.get(name)!);
  }

  async initializeAll(ctx: EngineContext): Promise<void> {
    if (this.initialized) {
      throw new Error('Modules have already been initialized.');
    }
    this.validateDependencies();
    const ordered = this.getModulesInDependencyOrder();
    for (const module of ordered) {
      await module.initialize(ctx);
    }
    this.initialized = true;
  }

  async startAll(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Cannot start modules before initialization.');
    }
    if (this.started) {
      throw new Error('Modules have already been started.');
    }
    const ordered = this.getModulesInDependencyOrder();
    for (const module of ordered) {
      if (module.start) {
        await module.start();
      }
    }
    this.started = true;
  }

  async stopAll(): Promise<void> {
    if (!this.started) {
      throw new Error('Cannot stop modules before start.');
    }
    if (this.stopped) {
      throw new Error('Modules have already been stopped.');
    }
    const ordered = this.getModulesInDependencyOrder().reverse();
    for (const module of ordered) {
      if (module.stop) {
        await module.stop();
      }
    }
    this.stopped = true;
  }

  async shutdownAll(): Promise<void> {
    const ordered = this.getModulesInDependencyOrder().reverse();
    for (const module of ordered) {
      if (module.shutdown) {
        await module.shutdown();
      }
    }
    this.modules.clear();
    this.initialized = false;
    this.started = false;
    this.stopped = false;
  }

  get(name: string): CyreModule | undefined {
    return this.modules.get(name);
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }

  getModuleNames(): string[] {
    return Array.from(this.modules.keys());
  }
}
