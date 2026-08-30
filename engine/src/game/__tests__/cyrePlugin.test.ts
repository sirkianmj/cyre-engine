import { describe, it, expect } from 'vitest';
import { CyrePluginSystem } from '../CyrePluginSystem.js';
import { CyrePluginRegistry } from '../CyrePluginRegistry.js';
import { CyrePluginContextImpl } from '../CyrePluginContext.js';
import { CyreScriptBuilder } from '../CyreScriptBuilder.js';
import type { CyrePlugin, CyrePluginContext } from '../CyrePluginTypes.js';
import { CyreScriptRegistry } from '../CyreScriptRegistry.js';
import { ScenarioDefinition } from '../../scenario/index.js';

function buildPluginScript(id: string): CyreScriptBuilder {
  return new CyreScriptBuilder()
    .withId(id)
    .withName('Plugin Script')
    .withOrganization('Plugin Org')
    .addNetworkNode('internet', 'external')
    .addNetworkNode('server', 'server')
    .addNetworkEdge('internet', 'server', 'connects')
    .setAttacker({ id: 'a', name: 'Attacker', objective: 'Objective', sophistication: 'low' })
    .setAttackPath('internet', 'server', ['internet', 'server'])
    .addObjective('obj', 'Objective');
}

class SamplePlugin implements CyrePlugin {
  readonly id: string;
  readonly name = 'Sample Plugin';
  readonly version = '1.0.0';
  readonly description = 'Test plugin';
  activated = false;
  deactivated = false;
  scriptsRegistered = 0;
  missionsRegistered = 0;

  constructor(id = 'sample-plugin') {
    this.id = id;
  }

  activate(context: CyrePluginContext): void {
    this.activated = true;
    const scriptId = `${this.id}-script`;
    context.registerScript(buildPluginScript(scriptId).buildScript());
    this.scriptsRegistered += 1;

    const missionId = `${this.id}-mission`;
    context.registerMission(missionId, () => {
      const script = buildPluginScript(`${this.id}-mission-script`).buildScript();
      return script.toScenarioDefinition();
    });
    this.missionsRegistered += 1;
  }

  deactivate(): void {
    this.deactivated = true;
  }
}

class DependencyPlugin implements CyrePlugin {
  readonly id = 'dependency-plugin';
  readonly name = 'Dependency Plugin';
  readonly version = '1.0.0';
  activated = false;

  activate(): void {
    this.activated = true;
  }
}

class DependentPlugin implements CyrePlugin {
  readonly id = 'dependent-plugin';
  readonly name = 'Dependent Plugin';
  readonly version = '1.0.0';
  readonly dependencies = ['dependency-plugin'];
  activated = false;

  activate(): void {
    this.activated = true;
  }
}

class FailingPlugin implements CyrePlugin {
  readonly id = 'failing-plugin';
  readonly name = 'Failing Plugin';
  readonly version = '1.0.0';

  activate(): void {
    throw new Error('activation failed');
  }
}

describe('CyrePluginSystem', () => {
  it('registers, activates, and deactivates a plugin', async () => {
    const system = new CyrePluginSystem();
    const plugin = new SamplePlugin();
    system.registerPlugin(plugin);
    expect(system.hasPlugin(plugin.id)).toBe(true);
    expect(system.listPlugins()).toHaveLength(1);

    await system.activatePlugin(plugin.id);
    expect(plugin.activated).toBe(true);
    expect(system.listActivePlugins()).toHaveLength(1);
    expect(system.hasScript(`${plugin.id}-script`)).toBe(true);
    expect(system.hasMission(`${plugin.id}-mission`)).toBe(true);

    const mission = system.createMission(`${plugin.id}-mission`);
    expect(mission).toBeInstanceOf(ScenarioDefinition);

    await system.deactivatePlugin(plugin.id);
    expect(plugin.deactivated).toBe(true);
    expect(system.hasScript(`${plugin.id}-script`)).toBe(false);
    expect(system.hasMission(`${plugin.id}-mission`)).toBe(false);
    expect(system.listActivePlugins()).toHaveLength(0);
  });

  it('deactivates all plugins in reverse activation order', async () => {
    const system = new CyrePluginSystem();
    const first = new SamplePlugin('sample-plugin-1');
    const second = new SamplePlugin('sample-plugin-2');

    system.registerPlugin(first);
    system.registerPlugin(second);
    await system.activatePlugin(first.id);
    await system.activatePlugin(second.id);

    const deactivationOrder: string[] = [];
    first.deactivate = () => {
      deactivationOrder.push(first.id);
    };
    second.deactivate = () => {
      deactivationOrder.push(second.id);
    };

    await system.deactivateAll();
    expect(deactivationOrder).toEqual(['sample-plugin-2', 'sample-plugin-1']);
    expect(system.listActivePlugins()).toHaveLength(0);
  });

  it('activates plugin dependencies before dependents', async () => {
    const system = new CyrePluginSystem();
    const dependency = new DependencyPlugin();
    const dependent = new DependentPlugin();
    system.registerPlugin(dependency);
    system.registerPlugin(dependent);

    await system.activatePlugin(dependency.id);
    await system.activatePlugin(dependent.id);

    expect(dependency.activated).toBe(true);
    expect(dependent.activated).toBe(true);
    expect(system.listActivePlugins()).toHaveLength(2);
  });

  it('rejects activation with inactive dependency', async () => {
    const system = new CyrePluginSystem();
    const dependency = new DependencyPlugin();
    const dependent = new DependentPlugin();
    system.registerPlugin(dependency);
    system.registerPlugin(dependent);

    await expect(system.activatePlugin(dependent.id)).rejects.toThrow(/dependency/);
    expect(dependent.activated).toBe(false);
  });

  it('rejects duplicate plugin registration and missing operations', async () => {
    const system = new CyrePluginSystem();
    const plugin = new SamplePlugin();
    system.registerPlugin(plugin);
    expect(() => system.registerPlugin(plugin)).toThrow(/already registered/);
    await expect(system.activatePlugin('missing')).rejects.toThrow(/does not exist/);
    await expect(system.deactivatePlugin('missing')).rejects.toThrow(/does not exist/);
  });

  it('handles plugin activation failure and marks error', async () => {
    const system = new CyrePluginSystem();
    const plugin = new FailingPlugin();
    system.registerPlugin(plugin);
    await expect(system.activatePlugin(plugin.id)).rejects.toThrow(/activation failed/);
    expect(system.listActivePlugins()).toHaveLength(0);
    expect(system.listPlugins()).toHaveLength(1);
  });

  it('lists registered scripts and mission ids', async () => {
    const system = new CyrePluginSystem();
    const plugin = new SamplePlugin();
    system.registerPlugin(plugin);
    await system.activatePlugin(plugin.id);

    expect(system.listScripts()).toHaveLength(1);
    expect(system.listMissionIds()).toEqual([`${plugin.id}-mission`]);
  });

  it('validates plugin system cleanly', async () => {
    const system = new CyrePluginSystem();
    const plugin = new SamplePlugin();
    system.registerPlugin(plugin);
    await system.activatePlugin(plugin.id);
    expect(() => system.validate()).not.toThrow();
  });
});

describe('CyrePluginRegistry', () => {
  it('supports low-level plugin state management', async () => {
    const registry = new CyrePluginRegistry();
    const plugin = new SamplePlugin();
    registry.register(plugin);
    expect(registry.getState(plugin.id)).toBe('registered');
    expect(registry.listActive()).toHaveLength(0);

    const scriptRegistry = new CyreScriptRegistry();
    const missionRegistry = new Map<string, () => ScenarioDefinition>();
    const context = new CyrePluginContextImpl(
      plugin.id,
      scriptRegistry,
      missionRegistry,
    );

    await registry.activate(plugin.id, context);
    expect(registry.getState(plugin.id)).toBe('active');
    expect(registry.listActive()).toHaveLength(1);
    expect(context.getRegisteredScriptIds()).toContain(`${plugin.id}-script`);
    expect(context.getRegisteredMissionIds()).toContain(`${plugin.id}-mission`);

    await registry.deactivate(plugin.id);
    expect(registry.getState(plugin.id)).toBe('inactive');
  });

  it('rejects deactivating non-active plugin', async () => {
    const registry = new CyrePluginRegistry();
    const plugin = new SamplePlugin();
    registry.register(plugin);
    await expect(registry.deactivate(plugin.id)).rejects.toThrow(/not active/);
  });

  it('rejects unregistering active plugin', async () => {
    const registry = new CyrePluginRegistry();
    const plugin = new SamplePlugin();
    registry.register(plugin);
    const scriptRegistry = new CyreScriptRegistry();
    const missionRegistry = new Map<string, () => ScenarioDefinition>();
    const context = new CyrePluginContextImpl(plugin.id, scriptRegistry, missionRegistry);
    await registry.activate(plugin.id, context);
    expect(() => registry.unregister(plugin.id)).toThrow(/active/);
  });
});
