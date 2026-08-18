export interface EditorCommand {
  id: string;
  label: string;
  category?: string;
  keywords?: string[];
  shortcut?: string;
  action?: () => void | Promise<void>;
}

export class CommandPalette {
  private readonly commands = new Map<string, EditorCommand>();
  private readonly recentCommandIds: string[] = [];

  addCommand(command: EditorCommand): void {
    if (!command.id || command.id.trim() === '') {
      throw new Error('Command id is required.');
    }
    if (!command.label || command.label.trim() === '') {
      throw new Error('Command label is required.');
    }
    if (this.commands.has(command.id)) {
      throw new Error(`Command "${command.id}" already exists.`);
    }
    this.commands.set(command.id, {
      ...command,
      keywords: command.keywords ? [...command.keywords] : [],
    });
  }

  removeCommand(commandId: string): void {
    if (!this.commands.has(commandId)) {
      throw new Error(`Command "${commandId}" does not exist.`);
    }
    this.commands.delete(commandId);
    const recentIndex = this.recentCommandIds.indexOf(commandId);
    if (recentIndex >= 0) {
      this.recentCommandIds.splice(recentIndex, 1);
    }
  }

  getCommand(commandId: string): EditorCommand {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command "${commandId}" does not exist.`);
    }
    return {
      ...command,
      keywords: command.keywords ? [...command.keywords] : [],
    };
  }

  listCommands(): EditorCommand[] {
    return [...this.commands.values()].map((command) => ({
      ...command,
      keywords: command.keywords ? [...command.keywords] : [],
    }));
  }

  search(query: string): EditorCommand[] {
    const normalizedQuery = query.trim().toLowerCase();
    const matching = this.listCommands().filter((command) => {
      if (normalizedQuery === '') {
        return true;
      }
      const searchableText = [
        command.id,
        command.label,
        command.category ?? '',
        ...(command.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });

    const recentSet = new Set(this.recentCommandIds);
    return matching.sort((a, b) => {
      const aRecent = recentSet.has(a.id) ? 1 : 0;
      const bRecent = recentSet.has(b.id) ? 1 : 0;
      return bRecent - aRecent;
    });
  }

  execute(commandId: string): boolean {
    const command = this.getCommand(commandId);
    this.recordRecent(commandId);
    if (command.action) {
      command.action();
    }
    return Boolean(command.action);
  }

  listRecentCommands(): EditorCommand[] {
    return this.recentCommandIds
      .map((id) => this.commands.get(id))
      .filter((command): command is EditorCommand => Boolean(command))
      .map((command) => ({
        ...command,
        keywords: command.keywords ? [...command.keywords] : [],
      }));
  }

  clearRecentCommands(): void {
    this.recentCommandIds.length = 0;
  }

  private recordRecent(commandId: string): void {
    const existingIndex = this.recentCommandIds.indexOf(commandId);
    if (existingIndex >= 0) {
      this.recentCommandIds.splice(existingIndex, 1);
    }
    this.recentCommandIds.unshift(commandId);
  }
}
