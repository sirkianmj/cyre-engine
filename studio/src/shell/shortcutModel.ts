/**
 * shortcutModel
 * --------------
 * The keyboard map for CYRE Studio. It is derived from the command registry
 * so the shortcuts window can never drift from what is actually bound.
 */

import type { CommandCategory, CommandDescriptor } from './commandModel';
import { createCommandDescriptors } from './commandRegistry';

export interface ShortcutEntry {
  id: string;
  label: string;
  shortcut: string;
  category: CommandCategory;
}

export interface ShortcutGroup {
  label: CommandCategory;
  items: ShortcutEntry[];
}

/** Every command that declares a keyboard shortcut, grouped by category. */
export function buildShortcutGroups(
  commands: readonly CommandDescriptor[] = createCommandDescriptors(),
): ShortcutGroup[] {
  const groups = new Map<CommandCategory, ShortcutEntry[]>();

  for (const command of commands) {
    if (!command.shortcut) continue;

    const entry: ShortcutEntry = {
      id: command.id,
      label: command.label,
      shortcut: command.shortcut,
      category: command.category,
    };

    const existing = groups.get(command.category);
    if (existing) existing.push(entry);
    else groups.set(command.category, [entry]);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export const MENU_COMMAND_GROUPS: readonly ShortcutGroup[] = buildShortcutGroups();

/** Normalises a keyboard event into the same notation used in the menus. */
export function formatShortcut(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.metaKey) parts.push('⌘');
  if (event.ctrlKey) parts.push('⌃');
  if (event.altKey) parts.push('⌥');
  if (event.shiftKey) parts.push('⇧');

  const key = event.key;
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(key)) return '';

  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return parts.join('');
}

/**
 * Resolves the command id bound to a keyboard event, if any. The binding
 * table is derived from the descriptors' `shortcut` strings so menus and
 * keys stay in sync.
 */
export function resolveShortcutCommand(
  event: KeyboardEvent,
  commands: ReadonlyMap<string, CommandDescriptor> = new Map(
    createCommandDescriptors().map((command) => [command.id, command]),
  ),
): string | null {
  const pressed = formatShortcut(event);
  if (!pressed) return null;

  for (const command of commands.values()) {
    if (command.shortcut && command.shortcut === pressed) return command.id;
  }

  return null;
}
