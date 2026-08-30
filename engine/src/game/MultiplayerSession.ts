import {
  isMultiplayerConnectionState,
  isMultiplayerMode,
  isMultiplayerPlayerRole,
  isMultiplayerSessionState,
  type MultiplayerAction,
  type MultiplayerConnectionState,
  type MultiplayerMessage,
  type MultiplayerMode,
  type MultiplayerPlayer,
  type MultiplayerPlayerInput,
  type MultiplayerReplicationSnapshot,
  type MultiplayerSessionOptions,
  type MultiplayerSessionState,
} from './MultiplayerTypes.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

type SessionListener = (snapshot: MultiplayerReplicationSnapshot) => void;

export class MultiplayerSession {
  readonly id: string;
  readonly mode: MultiplayerMode;
  readonly capacity: number;
  readonly name: string;
  private readonly nowFn: () => number;
  private readonly players = new Map<string, MultiplayerPlayer>();
  private readonly messages: MultiplayerMessage[] = [];
  private readonly actions: MultiplayerAction[] = [];
  private readonly listeners = new Set<SessionListener>();
  private stateValue: MultiplayerSessionState = 'lobby';
  private nextSequence = 1;
  private messageCountValue = 0;
  private actionCountValue = 0;

  constructor(options: MultiplayerSessionOptions) {
    assertNonEmpty(options.id, 'Multiplayer session id');
    if (!isMultiplayerMode(options.mode)) {
      throw new Error(`Invalid multiplayer mode "${options.mode}".`);
    }
    if (
      options.capacity !== undefined &&
      (!Number.isInteger(options.capacity) || options.capacity < 1)
    ) {
      throw new Error('Multiplayer session capacity must be a positive integer.');
    }
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('Multiplayer session name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('Multiplayer session now must be a function if provided.');
    }

    this.id = options.id;
    this.mode = options.mode;
    this.capacity = options.capacity ?? 8;
    this.name = options.name ?? options.id;
    this.nowFn = options.now ?? (() => Date.now());
  }

  getState(): MultiplayerSessionState {
    return this.stateValue;
  }

  getMode(): MultiplayerMode {
    return this.mode;
  }

  getName(): string {
    return this.name;
  }

  getCapacity(): number {
    return this.capacity;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getMessageCount(): number {
    return this.messageCountValue;
  }

  getActionCount(): number {
    return this.actionCountValue;
  }

  getSequence(): number {
    return this.nextSequence;
  }

  join(input: MultiplayerPlayerInput): MultiplayerPlayer {
    this.validatePlayerInput(input);
    if (this.stateValue !== 'lobby' && this.stateValue !== 'starting') {
      throw new Error(`Cannot join session "${this.id}" in state "${this.stateValue}".`);
    }
    if (this.players.has(input.id)) {
      throw new Error(`Player "${input.id}" is already in session "${this.id}".`);
    }
    if (this.players.size >= this.capacity) {
      throw new Error(`Session "${this.id}" is full.`);
    }

    const player: MultiplayerPlayer = {
      id: input.id,
      name: input.name,
      role: input.role,
      teamId: input.teamId,
      connectionState: 'connected',
      joinedAt: this.nowFn(),
      sessionId: this.id,
    };

    this.players.set(player.id, deepClone(player));
    this.pushMessage('system', 'player-joined', {
      playerId: player.id,
      playerName: player.name,
    });
    return deepClone(player);
  }

  leave(playerId: string): void {
    this.requirePlayer(playerId);
    this.players.delete(playerId);
    this.pushMessage('system', 'player-left', { playerId });
  }

  setPlayerRole(playerId: string, role: MultiplayerPlayerInput['role']): void {
    const player = this.requirePlayer(playerId);
    if (!isMultiplayerPlayerRole(role)) {
      throw new Error(`Invalid multiplayer player role "${role}".`);
    }
    player.role = role;
    this.pushMessage('system', 'player-role-changed', { playerId, role });
  }

  setPlayerConnectionState(
    playerId: string,
    connectionState: MultiplayerConnectionState,
  ): void {
    const player = this.requirePlayer(playerId);
    if (!isMultiplayerConnectionState(connectionState)) {
      throw new Error(`Invalid connection state "${connectionState}".`);
    }
    player.connectionState = connectionState;
    this.pushMessage('system', 'player-connection-changed', {
      playerId,
      connectionState,
    });
  }

  start(): void {
    if (this.stateValue !== 'lobby' && this.stateValue !== 'starting') {
      throw new Error(`Cannot start session "${this.id}" from state "${this.stateValue}".`);
    }
    this.stateValue = 'active';
    this.pushMessage('system', 'session-started');
  }

  pause(): void {
    if (this.stateValue !== 'active') {
      throw new Error(`Cannot pause session "${this.id}" from state "${this.stateValue}".`);
    }
    this.stateValue = 'paused';
    this.pushMessage('system', 'session-paused');
  }

  resume(): void {
    if (this.stateValue !== 'paused') {
      throw new Error(`Cannot resume session "${this.id}" from state "${this.stateValue}".`);
    }
    this.stateValue = 'active';
    this.pushMessage('system', 'session-resumed');
  }

  end(): void {
    if (this.stateValue === 'ended') {
      throw new Error(`Session "${this.id}" is already ended.`);
    }
    this.stateValue = 'ended';
    this.pushMessage('system', 'session-ended');
  }

  sendMessage(
    senderId: string,
    type: string,
    data?: Record<string, unknown>,
  ): MultiplayerMessage {
    this.requirePlayer(senderId);
    assertNonEmpty(type, 'Multiplayer message type');
    if (data !== undefined && !isRecord(data)) {
      throw new Error('Multiplayer message data must be an object if provided.');
    }

    return deepClone(this.pushMessage(senderId, type, data));
  }

  applyAction(action: {
    playerId: string;
    type: string;
    targetId?: string;
    data?: Record<string, unknown>;
  }): MultiplayerAction {
    if (!isRecord(action)) {
      throw new Error('Multiplayer action must be an object.');
    }
    this.requirePlayer(action.playerId);
    assertNonEmpty(action.type, 'Multiplayer action type');
    if (action.targetId !== undefined && action.targetId.trim() === '') {
      throw new Error('Multiplayer action targetId cannot be empty if provided.');
    }
    if (action.data !== undefined && !isRecord(action.data)) {
      throw new Error('Multiplayer action data must be an object if provided.');
    }
    if (this.stateValue !== 'active') {
      throw new Error(`Cannot apply action in session state "${this.stateValue}".`);
    }

    const sequence = this.nextSequence;
    const now = this.nowFn();
    const record: MultiplayerAction = {
      sequence,
      sessionId: this.id,
      playerId: action.playerId,
      type: action.type,
      targetId: action.targetId,
      timestamp: now,
      data: action.data !== undefined ? deepClone(action.data) : undefined,
    };

    this.nextSequence += 1;
    this.actionCountValue += 1;
    this.actions.push(deepClone(record));
    this.trimActionLog();
    this.pushMessage('action', 'action-applied', {
      playerId: action.playerId,
      type: action.type,
      targetId: action.targetId,
    });
    return deepClone(record);
  }

  getPlayer(playerId: string): MultiplayerPlayer | undefined {
    const player = this.players.get(playerId);
    return player !== undefined ? deepClone(player) : undefined;
  }

  listPlayers(): MultiplayerPlayer[] {
    return Array.from(this.players.values()).map((player) => deepClone(player));
  }

  listMessages(): MultiplayerMessage[] {
    return this.messages.map((message) => deepClone(message));
  }

  listActions(): MultiplayerAction[] {
    return this.actions.map((action) => deepClone(action));
  }

  getRecentMessages(limit = 20): MultiplayerMessage[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Multiplayer message limit must be a non-negative integer.');
    }
    return this.listMessages().slice(-limit);
  }

  getRecentActions(limit = 20): MultiplayerAction[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Multiplayer action limit must be a non-negative integer.');
    }
    return this.listActions().slice(-limit);
  }

  subscribe(listener: SessionListener): () => void {
    if (typeof listener !== 'function') {
      throw new Error('Multiplayer session listener must be a function.');
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  createReplicationSnapshot(): MultiplayerReplicationSnapshot {
    const players = this.listPlayers();
    const recentMessages = this.getRecentMessages(20);
    const recentActions = this.getRecentActions(20);

    return {
      sessionId: this.id,
      mode: this.mode,
      state: this.stateValue,
      sequence: this.nextSequence,
      playerCount: this.players.size,
      messageCount: this.messageCountValue,
      actionCount: this.actionCountValue,
      players,
      recentMessages,
      recentActions,
      summary: [
        this.id,
        this.mode,
        this.stateValue,
        `${players.length}/${this.capacity} players`,
        `${this.messageCountValue} messages`,
        `${this.actionCountValue} actions`,
      ].join(' | '),
    };
  }

  validate(): void {
    assertNonEmpty(this.id, 'Multiplayer session id');
    if (!isMultiplayerMode(this.mode)) {
      throw new Error(`Invalid multiplayer mode "${this.mode}".`);
    }
    if (!isMultiplayerSessionState(this.stateValue)) {
      throw new Error(`Invalid multiplayer session state "${this.stateValue}".`);
    }
    if (!Number.isInteger(this.capacity) || this.capacity < 1) {
      throw new Error('Multiplayer session capacity must be a positive integer.');
    }
    for (const player of this.players.values()) {
      if (!player.id || !player.name || !isMultiplayerPlayerRole(player.role)) {
        throw new Error('Multiplayer session contains an invalid player.');
      }
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      mode: this.mode,
      name: this.name,
      capacity: this.capacity,
      state: this.stateValue,
      sequence: this.nextSequence,
      players: this.listPlayers(),
      messages: this.listMessages(),
      actions: this.listActions(),
    };
  }

  private pushMessage(
    senderId: string,
    type: string,
    data?: Record<string, unknown>,
  ): MultiplayerMessage {
    const now = this.nowFn();
    const sequence = this.nextSequence;
    const message: MultiplayerMessage = {
      sequence,
      sessionId: this.id,
      senderId,
      type,
      timestamp: now,
      data: data !== undefined ? deepClone(data) : undefined,
    };

    this.nextSequence += 1;
    this.messageCountValue += 1;
    this.messages.push(deepClone(message));
    this.trimMessageLog();
    this.emitSnapshot();
    return message;
  }

  private requirePlayer(playerId: string): MultiplayerPlayer {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error(`Player "${playerId}" is not in session "${this.id}".`);
    }
    return player;
  }

  private validatePlayerInput(input: MultiplayerPlayerInput): void {
    if (!isRecord(input)) {
      throw new Error('Multiplayer player input must be an object.');
    }
    assertNonEmpty(input.id, 'Player id');
    assertNonEmpty(input.name, 'Player name');
    if (!isMultiplayerPlayerRole(input.role)) {
      throw new Error(`Invalid multiplayer player role "${input.role}".`);
    }
    if (input.teamId !== undefined && input.teamId.trim() === '') {
      throw new Error('Player teamId cannot be empty if provided.');
    }
  }

  private emitSnapshot(): void {
    const snapshot = this.createReplicationSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private trimMessageLog(): void {
    if (this.messages.length > 100) {
      this.messages.splice(0, this.messages.length - 100);
    }
  }

  private trimActionLog(): void {
    if (this.actions.length > 100) {
      this.actions.splice(0, this.actions.length - 100);
    }
  }
}
