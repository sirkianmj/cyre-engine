import { describe, it, expect, vi } from 'vitest';
import { CommandPalette } from '../CommandPalette.js';

function createPalette(): CommandPalette {
  const palette = new CommandPalette();
  palette.addCommand({
    id: 'open-project',
    label: 'Open Project',
    category: 'File',
    keywords: ['open', 'load'],
  });
  palette.addCommand({
    id: 'create-host',
    label: 'Create Host',
    category: 'Cyber Entity',
    keywords: ['host', 'server', 'node'],
  });
  palette.addCommand({
    id: 'run-simulation',
    label: 'Run Simulation',
    category: 'Play',
    keywords: ['play', 'start'],
  });
  return palette;
}

describe('CommandPalette', () => {
  it('adds and lists commands', () => {
    const palette = createPalette();
    expect(palette.listCommands()).toHaveLength(3);
    expect(palette.getCommand('open-project').label).toBe('Open Project');
  });

  it('throws on duplicate command id', () => {
    const palette = createPalette();
    expect(() =>
      palette.addCommand({ id: 'open-project', label: 'Duplicate Open' }),
    ).toThrow(/already exists/);
  });

  it('throws on invalid command id and label', () => {
    const palette = new CommandPalette();
    expect(() => palette.addCommand({ id: '', label: 'Bad' })).toThrow(/Command id is required/);
    expect(() => palette.addCommand({ id: 'bad-label', label: '   ' })).toThrow(/Command label is required/);
  });

  it('searches commands by label and category', () => {
    const palette = createPalette();
    expect(palette.search('host').map((command) => command.id)).toEqual(['create-host']);
    expect(palette.search('file').map((command) => command.id)).toEqual(['open-project']);
    expect(palette.search('').length).toBe(3);
  });

  it('searches commands using keywords', () => {
    const palette = createPalette();
    expect(palette.search('load').map((command) => command.id)).toEqual(['open-project']);
    expect(palette.search('start').map((command) => command.id)).toEqual(['run-simulation']);
  });

  it('executes a command action and records recent commands', () => {
    const palette = createPalette();
    const action = vi.fn();
    palette.addCommand({ id: 'run-action', label: 'Run Action', action });

    expect(palette.execute('run-action')).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(palette.listRecentCommands().map((command) => command.id)).toEqual(['run-action']);
  });

  it('sorts search results with recent commands first', () => {
    const palette = createPalette();
    palette.execute('create-host');
    palette.execute('open-project');

    const results = palette.search('');
    expect(results[0].id).toBe('open-project');
    expect(results[1].id).toBe('create-host');
  });

  it('removes a command and clears recent references', () => {
    const palette = createPalette();
    palette.execute('create-host');
    palette.removeCommand('create-host');

    expect(() => palette.getCommand('create-host')).toThrow(/does not exist/);
    expect(palette.listRecentCommands().map((command) => command.id)).not.toContain('create-host');
  });

  it('clears recent commands', () => {
    const palette = createPalette();
    palette.execute('create-host');
    palette.clearRecentCommands();
    expect(palette.listRecentCommands()).toHaveLength(0);
  });
});
