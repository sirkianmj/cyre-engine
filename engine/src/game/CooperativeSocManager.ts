import { CooperativeSocSession } from './CooperativeSocSession.js';
import type { CooperativeSocSessionOptions } from './CooperativeSocSession.js';

export interface CooperativeSocManagerSnapshot {
  name: string;
  sessionCount: number;
  sessionIds: string[];
  summary: string;
}

export class CooperativeSocManager {
  readonly name: string;
  private readonly sessions = new Map<string, CooperativeSocSession>();

  constructor(name = 'CYRE Cooperative SOC Manager') {
    if (!name || name.trim() === '') {
      throw new Error('CooperativeSocManager name is required.');
    }
    this.name = name;
  }

  createSession(options: CooperativeSocSessionOptions): CooperativeSocSession {
    const session = new CooperativeSocSession(options);
    if (this.sessions.has(session.getSessionId())) {
      throw new Error(`Cooperative SOC session "${session.getSessionId()}" already exists.`);
    }
    this.sessions.set(session.getSessionId(), session);
    return session;
  }

  removeSession(id: string): void {
    if (!this.sessions.delete(id)) {
      throw new Error(`Cooperative SOC session "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  get(id: string): CooperativeSocSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): CooperativeSocSession[] {
    return Array.from(this.sessions.values());
  }

  listSessionIds(): string[] {
    return Array.from(this.sessions.keys()).sort();
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('CooperativeSocManager name is required.');
    }
    for (const session of this.sessions.values()) {
      session.validate();
    }
  }

  createSnapshot(): CooperativeSocManagerSnapshot {
    const sessionIds = this.listSessionIds();
    return {
      name: this.name,
      sessionCount: this.sessions.size,
      sessionIds,
      summary: [
        this.name,
        `${this.sessions.size} sessions`,
      ].join(' | '),
    };
  }
}
