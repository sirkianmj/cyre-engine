import { describe, expect, it } from 'vitest';

import { Simulation } from '../Simulation.js';
import { SimulationWorld } from '../SimulationWorld.js';
import { CyberScenarioSimulation } from '../../cyber/simulation/CyberScenarioSimulation.js';
import { CyberSimulation } from '../../cyber/simulation/CyberSimulation.js';
import { CYBER_SCENARIOS } from '../../cyber/simulation/CyberScenarioCatalog.js';

import type { CyberScenarioDefinition } from '../../cyber/simulation/CyberScenarioDefinition.js';

describe('canonical kernel is the single runtime', () => {
  it('exposes the SimulationWorld a Simulation runs on', () => {
    const simulation = new Simulation({ id: 'kernel-test', name: 'Kernel', seed: 7 });
    simulation.initialize();

    const world = simulation.getWorld();
    expect(world).toBeInstanceOf(SimulationWorld);
    expect(world.now()).toBe(simulation.getTime());
  });

  it('keeps world state and simulation state identical after an action', () => {
    const simulation = new Simulation({ id: 'kernel-test', seed: 3 });
    simulation.initialize();

    simulation.executeAction({
      id: 'set',
      type: 'set',
      execute: () => ({ patch: { host: 'web-server', compromised: true } }),
    });

    expect(simulation.getWorld().getState()).toEqual(simulation.getState());
    expect(simulation.getWorld().getState().compromised).toBe(true);
  });

  it('records canonical events on the kernel event log', () => {
    const simulation = new Simulation({ id: 'kernel-test', seed: 1 });
    simulation.initialize();
    simulation.executeAction({
      id: 'act',
      type: 'act',
      execute: () => ({ events: [{ type: 'custom.thing', timestamp: 5 }] }),
    });

    const worldEvents = simulation.getWorld().getEvents();
    expect(worldEvents).toEqual(simulation.getEvents());
    expect(worldEvents.some((event) => event.type === 'custom.thing')).toBe(true);
    expect(worldEvents.some((event) => event.type === 'simulation.action')).toBe(true);
  });

  it('advances kernel time when the simulation advances', () => {
    const simulation = new Simulation({ id: 'kernel-test', seed: 1 });
    simulation.initialize();

    const before = simulation.getWorld().now();
    simulation.advanceTime(250);

    expect(simulation.getWorld().now()).toBe(before + 250);
    expect(simulation.getTime()).toBe(before + 250);
  });

  it('round-trips serialization through the kernel', () => {
    const original = new Simulation({ id: 'kernel-test', seed: 42 });
    original.initialize();
    original.executeAction({
      id: 'act',
      type: 'act',
      execute: () => ({ patch: { value: 9 } }),
    });
    original.advanceTime(100);

    const restored = Simulation.restore(original.serialize());

    expect(restored.getWorld().getState()).toEqual(original.getWorld().getState());
    expect(restored.getWorld().now()).toBe(original.getWorld().now());
    expect(restored.getWorld().getEvents()).toEqual(original.getWorld().getEvents());
  });
});

describe('CyberSimulation runs on the canonical kernel', () => {
  it('drives its state and time through SimulationWorld', () => {
    const simulation = new CyberSimulation(42);
    simulation.initialize();
    simulation.runRecon();

    const world = simulation.getWorld();
    expect(world).toBeInstanceOf(SimulationWorld);
    expect(world.getState()).toEqual(simulation.getState());
    expect(world.now()).toBe(simulation.getTime());
  });

  it('records attack and defense actions on the kernel event log', () => {
    const simulation = new CyberSimulation(42);
    simulation.initialize();
    simulation.runRecon();
    simulation.discoverServices();
    simulation.exploitWebServer();
    simulation.detectThreats();
    simulation.isolateHost('web-server');

    const worldEvents = simulation.getWorld().getEvents();

    // The kernel event log is the same log the cyber view exposes.
    expect(worldEvents).toEqual(simulation.getEventHistory());
    expect(worldEvents[0].type).toBe('simulation.initialized');

    // One canonical action event per executed action. Initialisation is itself
    // an action applied through the kernel, so it appears in the log too.
    const actionEvents = worldEvents.filter((event) => event.type === 'simulation.action');
    const actionIds = actionEvents.map(
      (event) => (event.data as { actionId: string }).actionId,
    );
    expect(actionIds).toEqual([
      'init-state',
      'recon',
      'service-discovery',
      'exploit-web',
      'detect-threats',
      'isolate-host',
    ]);

    // The domain-level consequences land in world state.
    const logs = (simulation.getWorld().getState().monitoring as {
      logs: Array<{ type: string }>;
    }).logs;
    for (const type of ['recon', 'service_discovery', 'exploit', 'defender_isolate']) {
      expect(
        logs.some((log) => log.type === type),
        `expected a "${type}" entry in world state`,
      ).toBe(true);
    }
  });

  it('executes actions at the current kernel time and advances only on step', () => {
    const simulation = new CyberSimulation(42);
    simulation.initialize();

    // Actions are instantaneous with respect to the kernel clock; explicit
    // stepping is what advances simulated time.
    const t0 = simulation.getWorld().now();
    simulation.runRecon();
    simulation.discoverServices();
    expect(simulation.getWorld().now()).toBe(t0);

    const t1 = simulation.step();
    expect(t1).toBeGreaterThan(t0);
    expect(simulation.getWorld().now()).toBe(t1);

    const t2 = simulation.step();
    expect(t2).toBeGreaterThan(t1);
    expect(simulation.getTime()).toBe(simulation.getWorld().now());
  });

  it('steps the kernel clock deterministically', () => {
    const left = new CyberSimulation(99);
    left.initialize();
    const right = new CyberSimulation(99);
    right.initialize();

    for (let i = 0; i < 3; i += 1) {
      expect(left.step()).toBe(right.step());
    }

    expect(left.getWorld().now()).toBe(right.getWorld().now());
  });
});

describe('generated scenarios execute through the canonical kernel', () => {
  /** Builds a scenario of the requested size, as a generator would. */
  function generatedScenario(index: number, hostCount: number): CyberScenarioDefinition {
    return {
      id: `generated-${index}`,
      name: `Generated Scenario ${index}`,
      description: `Synthetic ${hostCount}-host scenario used to prove kernel execution.`,
      seed: 1_000 + index,
      targetHostId: `host-${hostCount - 1}`,
      nodes: Array.from({ length: hostCount }, (_, host) => ({
        id: `host-${host}`,
        name: `Host ${host}`,
        type:
          host === 0
            ? ('internet' as const)
            : host % 3 === 0
              ? ('web_server' as const)
              : host % 3 === 1
                ? ('database_server' as const)
                : ('admin_workstation' as const),
        services:
          host % 3 === 0
            ? [{ name: 'http', port: 80, protocol: 'tcp' as const, vulnerability: 'CVE-2024-0001' }]
            : [],
        vulnerabilities: host % 3 === 0 ? ['CVE-2024-0001'] : [],
      })),
      connectionLogs: Array.from({ length: Math.max(0, hostCount - 1) }, (_, hop) => ({
        type: 'recon',
        source: `host-${hop}`,
        target: `host-${hop + 1}`,
      })),
    };
  }

  it('executes every catalog scenario on the kernel', () => {
    expect(CYBER_SCENARIOS.length).toBeGreaterThan(0);

    for (const scenario of CYBER_SCENARIOS) {
      const scenarioSimulation = new CyberScenarioSimulation(scenario);
      scenarioSimulation.initialize();

      const simulation = new CyberSimulation(scenario.seed);
      simulation.initialize();
      simulation.loadState(scenarioSimulation.getState());

      const world = simulation.getWorld();
      expect(world).toBeInstanceOf(SimulationWorld);
      expect(world.getState()).toEqual(simulation.getState());
      expect(Object.keys(world.getState().hosts as object)).toHaveLength(scenario.nodes.length);
      expect((world.getState().objective as { targetHostId: string }).targetHostId).toBe(
        scenario.targetHostId,
      );
    }
  });

  it('executes multiple generated scenarios of differing size on the kernel', () => {
    for (const hostCount of [3, 8, 25]) {
      const scenario = generatedScenario(hostCount, hostCount);
      const scenarioSimulation = new CyberScenarioSimulation(scenario);
      scenarioSimulation.initialize();

      const simulation = new CyberSimulation(scenario.seed);
      simulation.initialize();
      simulation.loadState(scenarioSimulation.getState());

      const world = simulation.getWorld();
      expect(Object.keys(world.getState().hosts as object)).toHaveLength(hostCount);
      expect(world.now()).toBe(simulation.getTime());
    }
  });

  it('produces identical kernel state for identical generated scenarios', () => {
    function runGenerated(index: number): Record<string, unknown> {
      const scenario = generatedScenario(index, 12);
      const scenarioSimulation = new CyberScenarioSimulation(scenario);
      scenarioSimulation.initialize();

      const simulation = new CyberSimulation(scenario.seed);
      simulation.initialize();
      simulation.loadState(scenarioSimulation.getState());
      simulation.runRecon();

      return simulation.getWorld().getState();
    }

    expect(runGenerated(1)).toEqual(runGenerated(1));
  });

  it('records generated-scenario execution on the kernel event log', () => {
    const scenario = generatedScenario(5, 6);
    const scenarioSimulation = new CyberScenarioSimulation(scenario);
    scenarioSimulation.initialize();

    const simulation = new CyberSimulation(scenario.seed);
    simulation.initialize();
    simulation.loadState(scenarioSimulation.getState());
    simulation.runRecon();
    simulation.detectThreats();

    const events = simulation.getWorld().getEvents();
    expect(events).toEqual(simulation.getEventHistory());
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((event) => event.type === 'simulation.initialized')).toBe(true);
  });
});
