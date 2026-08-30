import { describe, it, expect } from 'vitest';
import { ShortcutManager } from '../ShortcutSystem.js';

function createManager(): ShortcutManager {
  const manager = new ShortcutManager();
  manager.addBinding({ commandId: 'open-project', shortcut: 'CmdOrCtrl+O' });
  manager.addBinding({ commandId: 'run-simulation', shortcut: 'CmdOrCtrl+Enter' });
  manager.addBinding({ commandId: 'create-host', shortcut: 'CmdOrCtrl+H' });
  return manager;
}

describe('ShortcutManager', () => {
  it('adds and retrieves shortcut bindings', () => {
    const manager = createManager();
    expect(manager.listBindings()).toHaveLength(3);
    expect(manager.getBinding('open-project').shortcut).toBe('CmdOrCtrl+O');
  });

  it('throws on invalid binding', () => {
    const manager = new ShortcutManager();
    expect(() =>
      manager.addBinding({ commandId: '', shortcut: 'CmdOrCtrl+S' }),
    ).toThrow(/Command id is required/);
    expect(() =>
      manager.addBinding({ commandId: 'save', shortcut: '   ' }),
    ).toThrow(/Shortcut is required/);
  });

  it('rejects duplicate shortcut assignments', () => {
    const manager = createManager();
    expect(() =>
      manager.addBinding({ commandId: 'duplicate', shortcut: 'CmdOrCtrl+O' }),
    ).toThrow(/already assigned/);
  });

  it('finds commands by shortcut', () => {
    const manager = createManager();
    expect(manager.findByShortcut('CMDORCTRL+O')).toEqual(['open-project']);
    expect(manager.findByShortcut(' cmdorctrl+enter ')).toEqual(['run-simulation']);
  });

  it('updates a command shortcut', () => {
    const manager = createManager();
    manager.updateBinding('open-project', 'CmdOrCtrl+Shift+O');
    expect(manager.getBinding('open-project').shortcut).toBe('CmdOrCtrl+Shift+O');
  });

  it('prevents updating to an already assigned shortcut', () => {
    const manager = createManager();
    expect(() =>
      manager.updateBinding('open-project', 'CmdOrCtrl+Enter'),
    ).toThrow(/already assigned/);
  });

  it('removes a shortcut binding', () => {
    const manager = createManager();
    manager.removeBinding('create-host');
    expect(() => manager.getBinding('create-host')).toThrow(/does not have/);
    expect(manager.listBindings()).toHaveLength(2);
  });

  it('detects conflicts when added through different profiles', () => {
    const manager = new ShortcutManager();
    manager.addBinding({ commandId: 'command-a', shortcut: 'Ctrl+1', profile: 'default' });
    manager.addBinding({ commandId: 'command-b', shortcut: 'Ctrl+1', profile: 'extended' });
    expect(manager.hasConflicts()).toBe(true);
    expect(manager.findConflicts()).toEqual([
      {
        shortcut: 'ctrl+1',
        commandIds: ['command-a', 'command-b'],
      },
    ]);
  });

  it('lists bindings for a profile', () => {
    const manager = new ShortcutManager();
    manager.addBinding({ commandId: 'command-a', shortcut: 'Ctrl+1', profile: 'default' });
    manager.addBinding({ commandId: 'command-b', shortcut: 'Ctrl+2', profile: 'extended' });
    expect(manager.listBindingsForProfile('default').map((binding) => binding.commandId)).toEqual([
      'command-a',
    ]);
  });

  it('clears all bindings for a profile', () => {
    const manager = new ShortcutManager();
    manager.addBinding({ commandId: 'command-a', shortcut: 'Ctrl+1', profile: 'default' });
    manager.addBinding({ commandId: 'command-b', shortcut: 'Ctrl+2', profile: 'extended' });
    manager.clearProfile('default');
    expect(manager.listBindings().map((binding) => binding.commandId)).toEqual(['command-b']);
  });
});
