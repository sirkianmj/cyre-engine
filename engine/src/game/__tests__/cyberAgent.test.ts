import { describe, it, expect, vi } from 'vitest';
import {
  BaseCyberAgent,
  CyberAgentRegistry,
  CYBER_AGENT_ROLES,
  CYBER_AGENT_STATUSES,
  isCyberAgentRole,
  isCyberAgentStatus,
  type CyberAgentContext,
  type CyberAgentDecision,
} from '../index.js';

class TestAttackerAgent extends BaseCyberAgent {
  decision: CyberAgentDecision | undefined;

  constructor(id = 'agent-attacker', name = 'Test Attacker') {
    super(id, name, 'attacker');
  }

  protected decide(context: CyberAgentContext): CyberAgentDecision | void {
    if (!this.decision) return undefined;
    return {
      ...this.decision,
      action: {
        ...this.decision.action,
        timestamp: context.now(),
      },
    };
  }
}

function createContext(
  overrides: Partial<CyberAgentContext> = {},
): CyberAgentContext {
  return {
    agentId: 'agent-attacker',
    role: 'attacker',
    observe: vi.fn(() => ({
      agentId: 'agent-attacker',
      timestamp: 1000,
      summary: 'observed',
      events: [],
      entities: [],
    })),
    act: vi.fn(),
    report: vi.fn(),
    now: () => 1000,
    ...overrides,
  };
}

describe('CyberAgentTypes', () => {
  it('exposes roles and statuses', () => {
    expect(CYBER_AGENT_ROLES).toEqual(['attacker', 'defender', 'npc', 'analyst']);
    expect(CYBER_AGENT_STATUSES).toEqual(['idle', 'active', 'paused', 'terminated']);
    expect(isCyberAgentRole('defender')).toBe(true);
    expect(isCyberAgentRole('invalid')).toBe(false);
    expect(isCyberAgentStatus('active')).toBe(true);
    expect(isCyberAgentStatus('invalid')).toBe(false);
  });
});

describe('BaseCyberAgent', () => {
  it('manages lifecycle statuses', () => {
    const agent = new TestAttackerAgent();
    const context = createContext();
    expect(agent.getStatus()).toBe('idle');

    agent.start(context);
    expect(agent.getStatus()).toBe('active');

    agent.pause();
    expect(agent.getStatus()).toBe('paused');

    agent.resume();
    expect(agent.getStatus()).toBe('active');

    agent.stop();
    expect(agent.getStatus()).toBe('terminated');
  });

  it('validates agent context ownership', () => {
    const agent = new TestAttackerAgent();
    expect(() =>
      agent.start(createContext({ agentId: 'other-agent' })),
    ).toThrow(/does not match agent/);
    expect(() =>
      agent.start(createContext({ role: 'defender' as any })),
    ).toThrow(/does not match agent role/);
  });

  it('rejects invalid lifecycle transitions', () => {
    const agent = new TestAttackerAgent();
    const context = createContext();

    expect(() => agent.pause()).toThrow(/cannot pause/);
    expect(() => agent.resume()).toThrow(/cannot resume/);
    expect(() => agent.stop()).toThrow(/cannot stop/);

    agent.start(context);
    expect(() => agent.start(context)).toThrow(/cannot start/);
    expect(() => agent.resume()).toThrow(/cannot resume/);
  });

  it('steps and logs agent decisions', () => {
    const agent = new TestAttackerAgent();
    const act = vi.fn();
    const context = createContext({ act });

    agent.start(context);
    agent.decision = {
      action: {
        id: 'action-1',
        type: 'initial_access',
        targetId: 'employee-pc',
        timestamp: 0,
      },
      confidence: 0.9,
      reasoning: 'phishing likely',
    };

    const result = agent.step(context);
    expect(result).toBeDefined();
    expect(act).toHaveBeenCalledTimes(1);
    expect(act.mock.calls[0][0]).toMatchObject({
      id: 'action-1',
      type: 'initial_access',
      targetId: 'employee-pc',
    });

    const log = agent.getActionLog();
    expect(log).toHaveLength(1);
    expect(log[0].agentId).toBe('agent-attacker');
    expect(log[0].sequence).toBe(1);
  });

  it('rejects invalid decisions', () => {
    const agent = new TestAttackerAgent();
    const context = createContext();
    agent.start(context);

    agent.decision = {
      action: { id: '', type: 'x', timestamp: 1 },
      confidence: 0.5,
    };
    expect(() => agent.step(context)).toThrow(/must be a non-empty string/);

    agent.decision = {
      action: { id: 'a', type: 'x', timestamp: 1 },
      confidence: 1.5,
    };
    expect(() => agent.step(context)).toThrow(/confidence/);
  });

  it('does not log or act when decision is undefined', () => {
    const agent = new TestAttackerAgent();
    const act = vi.fn();
    const context = createContext({ act });
    agent.start(context);
    agent.decision = undefined;

    const result = agent.step(context);
    expect(result).toBeUndefined();
    expect(act).not.toHaveBeenCalled();
    expect(agent.getActionLog()).toHaveLength(0);
  });
});

describe('CyberAgentRegistry', () => {
  it('registers, lists, and steps agents', () => {
    const registry = new CyberAgentRegistry();
    const attacker = new TestAttackerAgent('attacker-1', 'Attacker One');
    registry.register(attacker);

    expect(registry.has('attacker-1')).toBe(true);
    expect(registry.listIds()).toEqual(['attacker-1']);
    expect(registry.list()).toHaveLength(1);
    expect(registry.listByRole('attacker')).toHaveLength(1);
    expect(registry.listByRole('defender')).toHaveLength(0);

    expect(() => registry.register(attacker)).toThrow(/already registered/);
    expect(() => registry.unregister('defender-1')).toThrow(/does not exist/);
  });

  it('steps agents by id and batch', () => {
    const registry = new CyberAgentRegistry();
    const attacker = new TestAttackerAgent();
    const act = vi.fn();
    const context = createContext({ act });
    registry.register(attacker);

    attacker.start(context);
    attacker.decision = {
      action: { id: 'a1', type: 'recon', timestamp: 0 },
      confidence: 0.7,
    };

    const result = registry.stepAgent('agent-attacker', context);
    expect(result).toBeDefined();
    expect(act).toHaveBeenCalledTimes(1);

    attacker.decision = {
      action: { id: 'a2', type: 'discovery', timestamp: 0 },
      confidence: 0.6,
    };
    const batch = registry.stepAll([
      { agentId: 'agent-attacker', context },
      { agentId: 'agent-attacker', context },
    ]);
    expect(batch).toHaveLength(2);
    expect(act).toHaveBeenCalledTimes(3);
  });

  it('throws when stepping unknown agent', () => {
    const registry = new CyberAgentRegistry();
    const context = createContext();
    expect(() => registry.stepAgent('missing', context)).toThrow(/does not exist/);
  });

  it('creates snapshot and validates cleanly', () => {
    const registry = new CyberAgentRegistry('Agent Registry');
    const attacker = new TestAttackerAgent('attacker-1', 'Attacker');
    registry.register(attacker);

    const snapshot = registry.createSnapshot();
    expect(snapshot.name).toBe('Agent Registry');
    expect(snapshot.agentCount).toBe(1);
    expect(snapshot.agentIds).toEqual(['attacker-1']);
    expect(snapshot.agentsByRole).toEqual({ attacker: ['attacker-1'] });
    expect(snapshot.summary).toContain('Agent Registry');
    expect(() => registry.validate()).not.toThrow();
  });
});
