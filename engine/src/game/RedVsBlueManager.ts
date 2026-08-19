import { RedVsBlueSession } from './RedVsBlueSession.js';
import type { RedVsBlueSessionOptions } from './RedVsBlueSession.js';

export interface RedVsBlueManagerSnapshot {
  name: string;
  sessionCount: number;
  sessionIds: string[];
  summary: string;
}

export class RedVsBlueManager {
  readonly name: string;
  private readonly sessions = new Map<string, RedVsBlueSession>();

  constructor(name = 'CYRE Red vs Blue Manager') {
    if (!name || name.trim() === '') {
      throw new Error('RedVsBlueManager name is required.');
    }
    this.name = name;
  }

  createSession(options: RedVsBlueSessionOptions): RedVsBlueSession {
    const session = new RedVsBlueSession(options);
    if (this.sessions.has(session.getSessionId())) {
      throw new Error(`Red vs Blue session "${session.getSessionId()}" already exists.`);
    }
    this.sessions.set(session.getSessionId(), session);
    return session;
  }

  removeSession(id: string): void {
    if (!this.sessions.delete(id)) {
      throw new Error(`Red vs Blue session "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  get(id: string): RedVsBlueSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): RedVsBlueSession[] {
    return Array.from(this.sessions.values());
  }

  listSessionIds(): string[] {
    return Array.from(this.sessions.keys()).sort();
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('RedVsBlueManager name is required.');
    }
    for (const session of this.sessions.values()) {
      session.validate();
    }
  }

  createSnapshot(): RedVsBlueManagerSnapshot {
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
