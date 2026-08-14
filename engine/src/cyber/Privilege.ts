/**
 * Privilege
 * ----------
 * Represents a named privilege or capability.
 * Privileges are simple string identifiers.
 */

export class Privilege {
  readonly name: string;
  readonly description?: string;

  constructor(name: string, description?: string) {
    if (!name || name.trim() === '') {
      throw new Error('Privilege name must be a non-empty string.');
    }
    this.name = name;
    this.description = description;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
    };
  }
}
