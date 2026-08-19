import { MultiplayerSession } from './MultiplayerSession.js';
import type {
  MultiplayerSessionManagerSnapshot,
  MultiplayerSessionOptions,
} from './MultiplayerTypes.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class MultiplayerSessionManager {
  readonly name: string;
  private readonly sessions = new Map<string, MultiplayerSession>();

  constructor(name = 'CYRE Multiplayer Session Manager') {
    if (!name || name.trim() === '') {
      throw new Error('MultiplayerSessionManager name is required.');
    }
    this.name = name;
  }

  createSession(options: MultiplayerSessionOptions): MultiplayerSession {
    if (!isRecord(options)) {
      throw new Error('Multiplayer session options must be an object.');
    }
    const session = new MultiplayerSession(options);
    if (this.sessions.has(session.id)) {
      throw new Error(`Multiplayer session "${session.id}" already exists.`);
    }
    this.sessions.set(session.id, session);
    return session;
  }

  removeSession(id: string): void {
    if (!this.sessions.delete(id)) {
      throw new Error(`Multiplayer session "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  get(id: string): MultiplayerSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): MultiplayerSession[] {
    return Array.from(this.sessions.values());
  }

  listSessionIds(): string[] {
    return Array.from(this.sessions.keys()).sort();
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('MultiplayerSessionManager name is required.');
    }
    for (const session of this.sessions.values()) {
      session.validate();
    }
  }

  createSnapshot(): MultiplayerSessionManagerSnapshot {
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
