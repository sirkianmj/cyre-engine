import { describe, it, expect, vi } from 'vitest';
import {
  AutonomousDefenderAgent,
  type CyberAgentContext,
} from '../index.js';
import {
  DefensiveAction,
  ALL_DEFENSIVE_ACTIONS,
} from '../../cyber/index.js';

function createContext(
  overrides: Partial<CyberAgentContext> = {},
): CyberAgentContext {
  return {
    agentId: 'defender-1',
    role: 'defender',
    observe: vi.fn(() => ({
      agentId: 'defender-1',
      timestamp: 1000,
      summary: 'observed attacker',
      events: [],
      entities: [],
    })),
    act: vi.fn(),
    report: vi.fn(),
    now: () => 1000,
    ...overrides,
  };
}

describe('AutonomousDefenderAgent', () => {
  it('creates with default defensive action sequence', () => {
    const agent = new AutonomousDefenderAgent({
      id: 'defender-1',
      name: 'Defender',
    });

    expect(agent.getPlannedActions()).toEqual(ALL_DEFENSIVE_ACTIONS);
    expect(agent.getAppliedActions()).toEqual([]);
    expect(agent.isComplete()).toBe(false);
  });

  it('creates with custom actions and target', () => {
    const agent = new AutonomousDefenderAgent({
      id: 'defender-1',
      name: 'Defender',
      actions: [
        DefensiveAction.Detect,
        DefensiveAction.Alert,
        DefensiveAction.Isolate,
      ],
      targetId: 'employee-pc',
    });

    expect(agent.getPlannedActions()).toEqual([
      DefensiveAction.Detect,
      DefensiveAction.Alert,
      DefensiveAction.Isolate,
    ]);
    expect(agent.getTargetId()).toBe('employee-pc');
  });

  it('rejects invalid constructor data', () => {
    expect(() =>
      new AutonomousDefenderAgent({ id: '', name: 'x' }),
    ).toThrow(/id/);
    expect(() =>
      new AutonomousDefenderAgent({ id: 'x', name: '' }),
    ).toThrow(/name/);
    expect(() =>
      new AutonomousDefenderAgent({ id: 'x', name: 'x', actions: [] }),
    ).toThrow(/non-empty/);
    expect(() =>
      new AutonomousDefenderAgent({
        id: 'x',
        name: 'x',
        actions: ['invalid' as any],
      }),
    ).toThrow(/defensive action/);
    expect(() =>
      new AutonomousDefenderAgent({
        id: 'x',
        name: 'x',
        actions: [DefensiveAction.Detect, DefensiveAction.Detect],
      }),
    ).toThrow(/Duplicate/);
    expect(() =>
      new AutonomousDefenderAgent({ id: 'x', name: 'x', targetId: '' }),
    ).toThrow(/targetId/);
  });

  it('applies planned actions sequentially', () => {
    const agent = new AutonomousDefenderAgent({
      id: 'defender-1',
      name: 'Defender',
      actions: [
        DefensiveAction.Monitor,
        DefensiveAction.Detect,
        DefensiveAction.Block,
      ],
      targetId: 'vpn',
    });

    const act = vi.fn();
    const context = createContext({ act });
    agent.start(context);

    const first = agent.step(context);
    expect(first).toBeDefined();
    expect(first!.action.type).toBe('defense:monitor');
    expect(first!.action.targetId).toBe('vpn');
    expect(agent.getAppliedActions()).toEqual([DefensiveAction.Monitor]);

    const second = agent.step(context);
    expect(second!.action.type).toBe('defense:detect');
    expect(agent.getAppliedActions()).toEqual([
      DefensiveAction.Monitor,
      DefensiveAction.Detect,
    ]);

    const third = agent.step(context);
    expect(third!.action.type).toBe('defense:block');
    expect(agent.getAppliedActions()).toEqual([
      DefensiveAction.Monitor,
      DefensiveAction.Detect,
      DefensiveAction.Block,
    ]);
  });

  it('stops after all planned actions are applied', () => {
    const agent = new AutonomousDefenderAgent({
      id: 'defender-1',
      name: 'Defender',
      actions: [DefensiveAction.Alert],
    });

    const context = createContext();
    agent.start(context);
    const first = agent.step(context);
    expect(first).toBeDefined();

    const second = agent.step(context);
    expect(second).toBeUndefined();
    expect(agent.isComplete()).toBe(true);
    expect(agent.getProgress().appliedActions).toEqual([DefensiveAction.Alert]);
  });

  it('requires active status before step', () => {
    const agent = new AutonomousDefenderAgent({
      id: 'defender-1',
      name: 'Defender',
    });
    const context = createContext();
    expect(() => agent.step(context)).toThrow(/not active/);
  });

  it('tracks progress', () => {
    const agent = new AutonomousDefenderAgent({
      id: 'defender-1',
      name: 'Defender',
      actions: [DefensiveAction.Detect, DefensiveAction.Recover],
      targetId: 'employee-pc',
    });

    expect(agent.getProgress()).toMatchObject({
      targetId: 'employee-pc',
      actionIndex: 0,
      totalActions: 2,
      completed: false,
    });

    const context = createContext();
    agent.start(context);
    agent.step(context);

    expect(agent.getProgress()).toMatchObject({
      actionIndex: 1,
      appliedActions: [DefensiveAction.Detect],
      completed: false,
    });
  });

  it('logs actions through base agent', () => {
    const agent = new AutonomousDefenderAgent({
      id: 'defender-1',
      name: 'Defender',
      actions: [DefensiveAction.Alert],
    });

    const context = createContext();
    agent.start(context);
    agent.step(context);

    const log = agent.getActionLog();
    expect(log).toHaveLength(1);
    expect(log[0].agentId).toBe('defender-1');
    expect(log[0].action.targetId).toBeUndefined();
    expect(log[0].action.type).toBe('defense:alert');
  });
});
