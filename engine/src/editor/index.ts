export {
  EditorShell,
  type EditorShellState,
  type EditorPanel,
  type EditorNotification,
  type MenuItem,
  type MenuGroup,
  type ToolbarButton,
  type PanelDockPosition,
} from './EditorShell.js';
export {
  DockManager,
  type DockPanel,
  type DockArea,
  type DockLayout,
} from './DockingSystem.js';
export {
  WorkspaceManager,
  PREDEFINED_WORKSPACES,
  type WorkspaceDefinition,
} from './WorkspaceSystem.js';
export {
  CommandPalette,
  type EditorCommand,
} from './CommandPalette.js';
export {
  ShortcutManager,
  type ShortcutBinding,
  type ShortcutConflict,
} from './ShortcutSystem.js';
