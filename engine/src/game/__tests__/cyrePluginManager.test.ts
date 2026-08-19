import { describe, it, expect } from 'vitest';
import { CyrePluginManager } from '../CyrePluginManager.js';
import { CyreScriptBuilder } from '../CyreScriptBuilder.js';
import type { CyrePlugin, CyrePluginContext } from '../CyrePluginTypes.js';
import { ScenarioDefinition } from '../../scenario/index.js';

class TestPlugin implements CyrePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly dependencies?: string[];
  activated = false;
  deactivated = false;
  activationOrder: string[] = [];

  constructor(options: {
    id: string;
    name?: string;
    version?: string;
    description?: string;
    dependencies?: string[];
    activationOrder?: string[];
  }) {
    this.id = options.id;
    this.name = options.name ?? options.id;
    this.version = options.version ?? '1.0.0';
    this.description = options.description;
    this.dependencies = options.dependencies;
    this.activationOrder = options.activationOrder ?? this.activationOrder;
  }

  activate(context: CyrePluginContext): void {
    this.activated = true;
    this.activationOrder.push(this.id);
    context.registerScript(
      new CyreScriptBuilder()
        .withId(`${this.id}-script`)
        .withName(`${this.id} script`)
        .withOrganization('Plugin Org')
        .addNetworkNode('internet', 'external')
        .addNetworkNode('server', 'server')
        .addNetworkEdge('internet', 'server', 'connects')
        .setAttacker({ id: 'attacker', name: 'Attacker', objective: 'Objective', sophistication: 'low' })
        .setAttackPath('internet', 'server', ['internet', 'server'])
        .addObjective('objective', 'Objective')
        .buildScript(),
    );

    context.registerMission(`${this.id}-mission`, () => {
      const script = new CyreScriptBuilder()
        .withId(`${this.id}-mission-script`)
        .withName(`${this.id} mission`)
        .withOrganization('Plugin Org')
        .addNetworkNode('internet', 'external')
        .addNetworkNode('server', 'server')
        .addNetworkEdge('internet', 'server', 'connects')
        .setAttacker({ id: 'attacker', name: 'Attacker', objective: 'Objective', sophistication: 'low' })
        .setAttackPath('internet', 'server', ['internet', 'server'])
        .addObjective('objective', 'Objective')
        .buildScript();
      return script.toScenarioDefinition();
    });
  }

  deactivate(): void {
    this.deactivated = true;
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

describe('CyrePluginManager', () => {
  it('registers plugins and exposes plugin info', () => {
    const manager = new CyrePluginManager();
    const plugin = new TestPlugin({
      id: 'plugin-a',
      name: 'Plugin A',
      version: '1.2.0',
      description: 'First plugin',
    });

    manager.registerPlugin(plugin);

    expect(manager.hasPlugin('plugin-a')).toBe(true);
    expect(manager.getPluginState('plugin-a')).toBe('registered');
    expect(manager.isActive('plugin-a')).toBe(false);

    const info = manager.getPluginInfo('plugin-a')!;
    expect(info).toMatchObject({
      id: 'plugin-a',
      name: 'Plugin A',
      version: '1.2.0',
      description: 'First plugin',
      state: 'registered',
      active: false,
    });
    expect(info.dependencies).toEqual([]);
  });

  it('enables and disables a plugin', async () => {
    const manager = new CyrePluginManager();
    const plugin = new TestPlugin({ id: 'plugin-a' });
    manager.registerPlugin(plugin);

    await manager.enable('plugin-a');
    expect(plugin.activated).toBe(true);
    expect(manager.isActive('plugin-a')).toBe(true);
    expect(manager.getPluginInfo('plugin-a')!.state).toBe('active');
    expect(manager.hasScript('plugin-a-script')).toBe(true);
    expect(manager.hasMission('plugin-a-mission')).toBe(true);

    await manager.disable('plugin-a');
    expect(plugin.deactivated).toBe(true);
    expect(manager.isActive('plugin-a')).toBe(false);
    expect(manager.getPluginInfo('plugin-a')!.state).toBe('inactive');
    expect(manager.hasScript('plugin-a-script')).toBe(false);
    expect(manager.hasMission('plugin-a-mission')).toBe(false);
  });

  it('enables all plugins in dependency order', async () => {
    const manager = new CyrePluginManager();
    const activationOrder: string[] = [];

    const dependency = new TestPlugin({ id: 'dependency', activationOrder });
    const dependent = new TestPlugin({
      id: 'dependent',
      dependencies: ['dependency'],
      activationOrder,
    });

    manager.registerPlugin(dependency);
    manager.registerPlugin(dependent);

    await manager.enableAll();

    expect(activationOrder).toEqual(['dependency', 'dependent']);
    expect(manager.listActivePlugins()).toHaveLength(2);
    expect(manager.listInactivePlugins()).toHaveLength(0);
  });

  it('throws when enabling all with unsatisfied dependency', async () => {
    const manager = new CyrePluginManager();
    const dependency = new TestPlugin({ id: 'dependency' });
    const dependent = new TestPlugin({
      id: 'dependent',
      dependencies: ['dependency'],
    });

    manager.registerPlugin(dependency);
    manager.registerPlugin(dependent);

    await manager.enable('dependent').catch(() => undefined);
    expect(manager.isActive('dependent')).toBe(false);

    await expect(manager.enableAll()).resolves.toBeUndefined();
  });

  it('tracks plugin errors', async () => {
    const manager = new CyrePluginManager();
    const plugin = new FailingPlugin();
    manager.registerPlugin(plugin);

    await expect(manager.enable(plugin.id)).rejects.toThrow(/activation failed/);
    expect(manager.listErrorPlugins()).toHaveLength(1);
    expect(manager.getPluginInfo(plugin.id)!.state).toBe('error');
    expect(manager.listActivePlugins()).toHaveLength(0);
  });

  it('disableAll deactivates all active plugins in reverse order', async () => {
    const manager = new CyrePluginManager();
    const first = new TestPlugin({ id: 'first' });
    const second = new TestPlugin({ id: 'second' });

    manager.registerPlugin(first);
    manager.registerPlugin(second);
    await manager.enable('first');
    await manager.enable('second');

    await manager.disableAll();

    expect(first.deactivated).toBe(true);
    expect(second.deactivated).toBe(true);
    expect(manager.listActivePlugins()).toHaveLength(0);
    expect(manager.listPluginsByState('inactive')).toHaveLength(2);
  });

  it('lists plugin infos sorted by id', () => {
    const manager = new CyrePluginManager();
    manager.registerPlugin(new TestPlugin({ id: 'z-plugin' }));
    manager.registerPlugin(new TestPlugin({ id: 'a-plugin' }));

    expect(manager.listPluginInfos().map((info) => info.id)).toEqual([
      'a-plugin',
      'z-plugin',
    ]);
  });

  it('lists plugin scripts and missions', async () => {
    const manager = new CyrePluginManager();
    const plugin = new TestPlugin({ id: 'integration' });
    manager.registerPlugin(plugin);
    await manager.enable('integration');

    expect(manager.listScripts()).toHaveLength(1);
    expect(manager.listMissionIds()).toEqual(['integration-mission']);
    expect(manager.hasMission('integration-mission')).toBe(true);
  });

  it('rejects invalid state query and validates cleanly', async () => {
    const manager = new CyrePluginManager();
    const plugin = new TestPlugin({ id: 'valid-plugin' });
    manager.registerPlugin(plugin);
    await manager.enable('valid-plugin');

    expect(() => manager.listPluginsByState('invalid' as any)).toThrow(/plugin state/);
    expect(() => manager.validate()).not.toThrow();
  });
});
