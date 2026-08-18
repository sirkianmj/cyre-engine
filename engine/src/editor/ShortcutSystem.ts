export interface ShortcutBinding {
  commandId: string;
  shortcut: string;
  profile?: string;
}

export interface ShortcutConflict {
  shortcut: string;
  commandIds: string[];
}

export class ShortcutManager {
  private readonly bindings = new Map<string, ShortcutBinding>();

  addBinding(binding: ShortcutBinding): void {
    this.validateBinding(binding);

    if (this.bindings.has(binding.commandId)) {
      throw new Error(`Command "${binding.commandId}" already has a shortcut binding.`);
    }

    const sameProfileDuplicates = this.findBindingsByShortcut(binding.shortcut).filter(
      (existing) => this.sameProfile(existing.profile, binding.profile),
    );

    if (sameProfileDuplicates.length > 0) {
      throw new Error(
        `Shortcut "${binding.shortcut}" is already assigned to: ${sameProfileDuplicates
          .map((item) => item.commandId)
          .join(', ')}.`,
      );
    }

    this.bindings.set(binding.commandId, { ...binding });
  }

  removeBinding(commandId: string): void {
    if (!this.bindings.has(commandId)) {
      throw new Error(`Command "${commandId}" does not have a shortcut binding.`);
    }
    this.bindings.delete(commandId);
  }

  updateBinding(commandId: string, shortcut: string): void {
    const binding = this.getBinding(commandId);
    const duplicateBindings = this.findBindingsByShortcut(shortcut)
      .filter((existing) => existing.commandId !== commandId)
      .filter((existing) => this.sameProfile(existing.profile, binding.profile));

    if (duplicateBindings.length > 0) {
      throw new Error(
        `Shortcut "${shortcut}" is already assigned to: ${duplicateBindings
          .map((item) => item.commandId)
          .join(', ')}.`,
      );
    }

    this.bindings.set(commandId, {
      ...binding,
      shortcut,
    });
  }

  getBinding(commandId: string): ShortcutBinding {
    const binding = this.bindings.get(commandId);
    if (!binding) {
      throw new Error(`Command "${commandId}" does not have a shortcut binding.`);
    }
    return { ...binding };
  }

  listBindings(): ShortcutBinding[] {
    return [...this.bindings.values()].map((binding) => ({ ...binding }));
  }

  findByShortcut(shortcut: string): string[] {
    return this.findBindingsByShortcut(shortcut)
      .map((binding) => binding.commandId)
      .sort();
  }

  hasConflicts(): boolean {
    return this.findConflicts().length > 0;
  }

  findConflicts(): ShortcutConflict[] {
    const byShortcut = new Map<string, string[]>();
    for (const binding of this.listBindings()) {
      const key = this.normalizeShortcut(binding.shortcut);
      const commandIds = byShortcut.get(key) ?? [];
      commandIds.push(binding.commandId);
      byShortcut.set(key, commandIds);
    }

    const conflicts: ShortcutConflict[] = [];
    for (const [shortcut, commandIds] of byShortcut.entries()) {
      if (commandIds.length > 1) {
        conflicts.push({
          shortcut,
          commandIds: [...commandIds].sort(),
        });
      }
    }

    return conflicts.sort((a, b) => a.shortcut.localeCompare(b.shortcut));
  }

  listBindingsForProfile(profile: string): ShortcutBinding[] {
    return this.listBindings().filter((binding) => binding.profile === profile);
  }

  clearProfile(profile: string): void {
    const profileBindings = this.listBindingsForProfile(profile);
    for (const binding of profileBindings) {
      this.bindings.delete(binding.commandId);
    }
  }

  private findBindingsByShortcut(shortcut: string): ShortcutBinding[] {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    return this.listBindings().filter(
      (binding) => this.normalizeShortcut(binding.shortcut) === normalizedShortcut,
    );
  }

  private sameProfile(profileA?: string, profileB?: string): boolean {
    return (profileA ?? null) === (profileB ?? null);
  }

  private validateBinding(binding: ShortcutBinding): void {
    if (!binding.commandId || binding.commandId.trim() === '') {
      throw new Error('Command id is required.');
    }
    if (!binding.shortcut || binding.shortcut.trim() === '') {
      throw new Error('Shortcut is required.');
    }
  }

  private normalizeShortcut(shortcut: string): string {
    return shortcut.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
