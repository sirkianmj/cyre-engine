import { describe, it, expect } from 'vitest';
import { SceneEditor } from '../SceneEditor.js';

function createEditor(): SceneEditor {
  return new SceneEditor('scene-editor', 'Editor Scene');
}

describe('SceneEditor', () => {
  it('creates an empty scene', () => {
    const editor = createEditor();
    expect(editor.getScene().getId()).toBe('scene-editor');
    expect(editor.getScene().getComponents()).toHaveLength(0);
  });

  it('adds an organization and selects it', () => {
    const editor = createEditor();
    editor.addOrganization('org-1', 'Acme', 'Technology');
    expect(editor.getSelectedComponentId()).toBe('org-1');
    expect(editor.getScene().getComponent('org-1').data).toEqual({
      industry: 'Technology',
      description: undefined,
    });
  });

  it('adds a network with nodes and edges', () => {
    const editor = createEditor();
    editor.addNetwork('net-1', 'Main Net', ['internet', 'host'], [{ source: 'internet', target: 'host' }]);
    const network = editor.getScene().getComponent('net-1');
    expect(network.type).toBe('network');
    expect(network.data).toEqual({
      nodes: ['internet', 'host'],
      edges: [{ source: 'internet', target: 'host' }],
    });
  });

  it('connects nodes in a network', () => {
    const editor = createEditor();
    editor.addNetwork('net-1', 'Main Net', ['internet', 'host', 'database']);
    editor.connectNodes('net-1', 'internet', 'host');
    editor.connectNodes('net-1', 'host', 'database');

    const network = editor.getScene().getComponent('net-1');
    expect(network.data?.edges).toEqual([
      { source: 'internet', target: 'host' },
      { source: 'host', target: 'database' },
    ]);
  });

  it('rejects connecting unknown network nodes', () => {
    const editor = createEditor();
    editor.addNetwork('net-1', 'Main Net', ['internet']);
    expect(() => editor.connectNodes('net-1', 'internet', 'missing')).toThrow(/does not exist/);
  });

  it('rejects duplicate network edges', () => {
    const editor = createEditor();
    editor.addNetwork('net-1', 'Main Net', ['internet', 'host']);
    editor.connectNodes('net-1', 'internet', 'host');
    expect(() => editor.connectNodes('net-1', 'internet', 'host')).toThrow(/already exists/);
  });

  it('removes a component and clears selection if needed', () => {
    const editor = createEditor();
    editor.addHost('host-1', 'employee-pc', 'Employee PC');
    expect(editor.getSelectedComponentId()).toBe('host-1');

    editor.removeComponent('host-1');
    expect(editor.getSelectedComponentId()).toBeUndefined();
    expect(() => editor.getScene().getComponent('host-1')).toThrow(/does not exist/);
  });

  it('undoes and redoes component changes', () => {
    const editor = createEditor();
    editor.addOrganization('org-1', 'Acme');
    expect(editor.getScene().getComponents()).toHaveLength(1);

    editor.addHost('host-1', 'employee-pc');
    expect(editor.getScene().getComponents()).toHaveLength(2);

    expect(editor.undo()).toBe(true);
    expect(editor.getScene().getComponents()).toHaveLength(1);

    expect(editor.redo()).toBe(true);
    expect(editor.getScene().getComponents()).toHaveLength(2);
  });

  it('export scene data remains isolated', () => {
    const editor = createEditor();
    editor.addOrganization('org-1', 'Acme');
    const data = editor.getSceneData();
    data.components.push({ id: 'external', type: 'host', name: 'External' });

    expect(editor.getScene().getComponents()).toHaveLength(1);
  });
});
