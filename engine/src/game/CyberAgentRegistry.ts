import {
  isCyberAgentRole,
  type CyberAgent,
  type CyberAgentContext,
  type CyberAgentRegistrySnapshot,
  type CyberAgentRole,
} from './CyberAgentTypes.js';

interface RegisteredAgentEntry {
  agent: CyberAgent;
  state: 'registered';
}

export class CyberAgentRegistry {
  readonly name: string;
  private readonly agents = new Map<string, RegisteredAgentEntry>();

  constructor(name = 'CYRE Cyber Agent Registry') {
    if (!name || name.trim() === '') {
      throw new Error('CyberAgentRegistry name is required.');
    }
    this.name = name;
  }

  register(agent: CyberAgent): void {
    this.validateAgent(agent);
    if (this.agents.has(agent.id)) {
      throw new Error(`CyberAgent "${agent.id}" is already registered.`);
    }
    this.agents.set(agent.id, { agent, state: 'registered' });
  }

  unregister(id: string): void {
    if (!this.agents.delete(id)) {
      throw new Error(`CyberAgent "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }

  get(id: string): CyberAgent | undefined {
    return this.agents.get(id)?.agent;
  }

  list(): CyberAgent[] {
    return Array.from(this.agents.values()).map((entry) => entry.agent);
  }

  listIds(): string[] {
    return Array.from(this.agents.keys()).sort();
  }

  listByRole(role: CyberAgentRole): CyberAgent[] {
    if (!isCyberAgentRole(role)) {
      throw new Error(`Invalid cyber agent role "${role}".`);
    }
    return this.list().filter((agent) => agent.role === role);
  }

  stepAgent(
    id: string,
    context: CyberAgentContext,
  ) {
    const agent = this.requireAgent(id);
    return agent.step(context);
  }

  stepAll(
    entries: Array<{ agentId: string; context: CyberAgentContext }>,
  ): Array<{ agentId: string; result: unknown }> {
    if (!Array.isArray(entries)) {
      throw new Error('CyberAgentRegistry stepAll entries must be an array.');
    }

    return entries.map(({ agentId, context }) => ({
      agentId,
      result: this.stepAgent(agentId, context),
    }));
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('CyberAgentRegistry name is required.');
    }
    for (const { agent } of this.agents.values()) {
      this.validateAgent(agent);
    }
  }

  createSnapshot(): CyberAgentRegistrySnapshot {
    const agentIds = this.listIds();
    const agentsByRole: Record<string, string[]> = {};

    for (const agent of this.list()) {
      const roleKey = agent.role;
      agentsByRole[roleKey] = [
        ...(agentsByRole[roleKey] ?? []),
        agent.id,
      ];
    }

    for (const role of Object.keys(agentsByRole)) {
      agentsByRole[role].sort();
    }

    return {
      name: this.name,
      agentCount: this.agents.size,
      agentIds,
      agentsByRole,
      summary: [
        this.name,
        `${this.agents.size} agents`,
        `roles=${Object.keys(agentsByRole).length}`,
      ].join(' | '),
    };
  }

  private requireAgent(id: string): CyberAgent {
    const agent = this.agents.get(id)?.agent;
    if (!agent) {
      throw new Error(`CyberAgent "${id}" does not exist.`);
    }
    return agent;
  }

  private validateAgent(agent: CyberAgent): void {
    if (!agent || typeof agent !== 'object') {
      throw new Error('CyberAgent must be an object.');
    }
    if (!agent.id || agent.id.trim() === '') {
      throw new Error('CyberAgent id is required.');
    }
    if (!agent.name || agent.name.trim() === '') {
      throw new Error('CyberAgent name is required.');
    }
    if (!isCyberAgentRole(agent.role)) {
      throw new Error(`Invalid cyber agent role "${agent.role}".`);
    }
    if (typeof agent.step !== 'function') {
      throw new Error('CyberAgent step() must be a function.');
    }
    if (typeof agent.start !== 'function') {
      throw new Error('CyberAgent start() must be a function.');
    }
  }
}
