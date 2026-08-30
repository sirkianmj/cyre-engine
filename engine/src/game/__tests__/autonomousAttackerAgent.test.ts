import { describe, it, expect, vi } from 'vitest';
import {
  AutonomousAttackerAgent,
  type CyberAgentContext,
} from '../index.js';
import { AttackStage } from '../../cyber/index.js';

function createContext(
  overrides: Partial<CyberAgentContext> = {},
): CyberAgentContext {
  return {
    agentId: 'attacker-1',
    role: 'attacker',
    observe: vi.fn(() => ({
      agentId: 'attacker-1',
      timestamp: 1000,
      summary: 'observed world',
      events: [],
      entities: [],
    })),
    act: vi.fn(),
    report: vi.fn(),
    now: () => 1000,
    ...overrides,
  };
}

describe('AutonomousAttackerAgent', () => {
  it('creates with a valid attack path', () => {
    const agent = new AutonomousAttackerAgent({
      id: 'attacker-1',
      name: 'Autonomous Attacker',
      attackPath: ['internet', 'vpn', 'employee-pc', 'database'],
    });

    expect(agent.getAttackPath()).toEqual([
      'internet',
      'vpn',
      'employee-pc',
      'database',
    ]);
    expect(agent.getCurrentNode()).toBe('internet');
    expect(agent.getCurrentStage()).toBe(AttackStage.Recon);
  });

  it('rejects invalid constructor data', () => {
    expect(() =>
      new AutonomousAttackerAgent({
        id: '',
        name: 'x',
        attackPath: ['a', 'b'],
      }),
    ).toThrow(/id/);
    expect(() =>
      new AutonomousAttackerAgent({
        id: 'x',
        name: '',
        attackPath: ['a', 'b'],
      }),
    ).toThrow(/name/);
    expect(() =>
      new AutonomousAttackerAgent({
        id: 'x',
        name: 'x',
        attackPath: ['a'],
      }),
    ).toThrow(/at least two nodes/);
    expect(() =>
      new AutonomousAttackerAgent({
        id: 'x',
        name: 'x',
        attackPath: ['a', ''],
      }),
    ).toThrow(/non-empty/);
    expect(() =>
      new AutonomousAttackerAgent({
        id: 'x',
        name: 'x',
        attackPath: ['a', 'b'],
        initialStage: 'invalid' as any,
      }),
    ).toThrow(/initial attack stage/);
  });

  it('decides and advances along path', () => {
    const agent = new AutonomousAttackerAgent({
      id: 'attacker-1',
      name: 'Attacker',
      attackPath: ['internet', 'vpn', 'database'],
    });
    const act = vi.fn();
    const context = createContext({ act });

    agent.start(context);

    const decision1 = agent.step(context);
    expect(decision1).toBeDefined();
    expect(decision1!.action).toMatchObject({
      sourceId: 'internet',
      targetId: 'vpn',
    });
    expect(act).toHaveBeenCalledWith(decision1!.action);
    expect(agent.getCurrentNode()).toBe('vpn');
    expect(agent.getPathIndex()).toBe(1);

    const decision2 = agent.step(context);
    expect(decision2).toBeDefined();
    expect(decision2!.action).toMatchObject({
      sourceId: 'vpn',
      targetId: 'database',
    });
    expect(agent.getCurrentNode()).toBe('database');
    expect(agent.getCurrentStage()).toBe(AttackStage.Impact);
  });

  it('stops deciding after final node', () => {
    const agent = new AutonomousAttackerAgent({
      id: 'attacker-1',
      name: 'Attacker',
      attackPath: ['internet', 'database'],
    });
    const context = createContext();
    agent.start(context);

    const first = agent.step(context);
    expect(first).toBeDefined();
    expect(agent.getProgress()).toMatchObject({
      currentNode: 'database',
      pathIndex: 1,
      remainingNodes: 0,
      completed: true,
    });

    const second = agent.step(context);
    expect(second).toBeUndefined();
  });

  it('tracks progress', () => {
    const agent = new AutonomousAttackerAgent({
      id: 'attacker-1',
      name: 'Attacker',
      attackPath: ['internet', 'vpn', 'database'],
    });

    expect(agent.getProgress()).toMatchObject({
      currentNode: 'internet',
      pathIndex: 0,
      totalNodes: 3,
      remainingNodes: 2,
      completed: false,
    });

    const context = createContext();
    agent.start(context);
    agent.step(context);

    expect(agent.getProgress()).toMatchObject({
      currentNode: 'vpn',
      pathIndex: 1,
      remainingNodes: 1,
      completed: false,
    });
  });

  it('logs actions through base agent', () => {
    const agent = new AutonomousAttackerAgent({
      id: 'attacker-1',
      name: 'Attacker',
      attackPath: ['internet', 'vpn'],
    });
    const context = createContext();
    agent.start(context);
    agent.step(context);

    const log = agent.getActionLog();
    expect(log).toHaveLength(1);
    expect(log[0].agentId).toBe('attacker-1');
    expect(log[0].action.targetId).toBe('vpn');
  });

  it('requires active status before step', () => {
    const agent = new AutonomousAttackerAgent({
      id: 'attacker-1',
      name: 'Attacker',
      attackPath: ['internet', 'vpn'],
    });
    const context = createContext();
    expect(() => agent.step(context)).toThrow(/not active/);
  });
});
