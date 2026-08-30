/**
 * commandModel
 * -------------
 * Types shared by the menu bar, the command palette, the keyboard layer and
 * the window registry. Every user-visible action in CYRE Studio resolves to
 * a command id, which keeps the menu bar, shortcuts and palette in sync.
 */

import type { StudioApplication } from '../studio/StudioApplication';
import type { WindowKind } from './windowCatalog';

export type CommandCategory =
  | 'File'
  | 'Edit'
  | 'View'
  | 'Scenarios'
  | 'Simulation'
  | 'Visualize'
  | 'Research'
  | 'Replay'
  | 'Tools'
  | 'Window'
  | 'Help';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

export interface CommandContext {
  application: StudioApplication;
  notify: (level: NotificationLevel, message: string) => void;
  /** Writes a text document to the user's downloads. */
  download: (filename: string, mime: string, content: string) => void;
  /** Opens a file picker and resolves with the selected document text. */
  pickTextFile: (accept: string) => Promise<string>;
  /** Asks the user to confirm a destructive action. */
  confirm: (title: string, message: string) => Promise<boolean>;
  /** Toggles the command palette overlay. */
  togglePalette: () => void;
  /** Opens (or focuses) a window. */
  openWindow: (kind: WindowKind) => void;
}

export interface CommandDescriptor {
  id: string;
  label: string;
  category: CommandCategory;
  shortcut?: string;
  /** Set when the command's only effect is presenting a window. */
  windowKind?: WindowKind;
  destructive?: boolean;
  run: (context: CommandContext) => void | Promise<void>;
}

export type CommandRegistry = ReadonlyMap<string, CommandDescriptor>;

export function indexCommands(commands: readonly CommandDescriptor[]): CommandRegistry {
  const index = new Map<string, CommandDescriptor>();
  for (const command of commands) {
    if (index.has(command.id)) {
      throw new Error(`Duplicate command id "${command.id}".`);
    }
    index.set(command.id, command);
  }
  return index;
}
