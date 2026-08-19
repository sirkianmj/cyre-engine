import { CyreScript } from './CyreScript.js';

export class CyreScriptRegistry {
  private scripts: Map<string, CyreScript> = new Map();

  register(script: CyreScript): void {
    script.validate();
    if (this.scripts.has(script.getId())) {
      throw new Error(`CyreScript "${script.getId()}" is already registered.`);
    }
    this.scripts.set(script.getId(), new CyreScript(script.getDefinition()));
  }

  unregister(id: string): void {
    if (!this.scripts.delete(id)) {
      throw new Error(`CyreScript "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.scripts.has(id);
  }

  get(id: string): CyreScript | undefined {
    const script = this.scripts.get(id);
    return script !== undefined ? new CyreScript(script.getDefinition()) : undefined;
  }

  list(): CyreScript[] {
    return Array.from(this.scripts.values()).map(
      (script) => new CyreScript(script.getDefinition()),
    );
  }

  listIds(): string[] {
    return Array.from(this.scripts.keys()).sort();
  }

  validate(): void {
    for (const script of this.scripts.values()) {
      script.validate();
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      scripts: this.list().map((script) => script.toJSON()),
    };
  }

  static fromJSON(data: Record<string, unknown>): CyreScriptRegistry {
    const registry = new CyreScriptRegistry();
    const rawScripts = Array.isArray(data.scripts)
      ? (data.scripts as Record<string, unknown>[])
      : [];
    for (const rawScript of rawScripts) {
      registry.register(CyreScript.fromJSON(rawScript));
    }
    return registry;
  }
}
