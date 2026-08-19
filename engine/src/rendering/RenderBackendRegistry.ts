import type { RenderBackend } from './RenderBackend.js';

export class RenderBackendRegistry {
  private backends: Map<string, RenderBackend> = new Map();
  private defaultBackendId?: string;

  register(backend: RenderBackend): void {
    if (!backend.id || backend.id.trim() === '') {
      throw new Error('RenderBackend id is required.');
    }
    if (this.backends.has(backend.id)) {
      throw new Error(`RenderBackend "${backend.id}" is already registered.`);
    }
    this.backends.set(backend.id, backend);
  }

  unregister(id: string): void {
    if (!this.backends.has(id)) {
      throw new Error(`RenderBackend "${id}" does not exist.`);
    }
    this.backends.delete(id);
    if (this.defaultBackendId === id) {
      this.defaultBackendId = undefined;
    }
  }

  has(id: string): boolean {
    return this.backends.has(id);
  }

  get(id: string): RenderBackend | undefined {
    return this.backends.get(id);
  }

  list(): RenderBackend[] {
    return Array.from(this.backends.values());
  }

  setDefault(id: string): void {
    if (!this.backends.has(id)) {
      throw new Error(`Cannot set default backend: "${id}" does not exist.`);
    }
    this.defaultBackendId = id;
  }

  getDefault(): RenderBackend | undefined {
    return this.defaultBackendId !== undefined
      ? this.backends.get(this.defaultBackendId)
      : undefined;
  }
}
