function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class SimulationState {
  private data: Record<string, unknown>;

  constructor(initial: Record<string, unknown> = {}) {
    if (!initial || typeof initial !== 'object' || Array.isArray(initial)) {
      throw new Error('SimulationState initial data must be an object.');
    }
    this.data = deepClone(initial);
  }

  get<T = unknown>(key: string): T | undefined {
    return this.data[key] as T | undefined;
  }

  getAll(): Record<string, unknown> {
    return deepClone(this.data);
  }

  applyPatch(patch: Record<string, unknown>): void {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('SimulationState patch must be an object.');
    }
    for (const [key, value] of Object.entries(patch)) {
      this.data[key] = value;
    }
  }

  toJSON(): Record<string, unknown> {
    return deepClone(this.data);
  }

  static fromJSON(json: Record<string, unknown>): SimulationState {
    return new SimulationState(json);
  }
}
