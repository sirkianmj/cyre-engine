import { describe, it, expect } from 'vitest';
import { Inspector, type InspectorProperty } from '../Inspector.js';

function createInspector(): Inspector {
  const inspector = new Inspector();
  inspector.selectTarget('server-001', 'Web Server', [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'string',
      value: 'web01',
      category: 'Identity',
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      value: 443,
      category: 'Network',
    },
    {
      key: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      value: true,
      category: 'Configuration',
    },
    {
      key: 'metadata',
      label: 'Metadata',
      type: 'object',
      value: { environment: 'production' },
      category: 'Configuration',
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'array',
      value: ['web', 'production'],
      category: 'Configuration',
    },
  ]);
  return inspector;
}

describe('Inspector', () => {
  it('selects a target and returns its id', () => {
    const inspector = createInspector();
    expect(inspector.getSelectedTargetId()).toBe('server-001');
  });

  it('rejects selection with missing id or name', () => {
    const inspector = new Inspector();
    expect(() => inspector.selectTarget('', 'Name', [])).toThrow(/target id is required/);
    expect(() => inspector.selectTarget('id', '   ', [])).toThrow(/target name is required/);
  });

  it('rejects duplicate property keys', () => {
    const inspector = new Inspector();
    expect(() =>
      inspector.selectTarget('id', 'Name', [
        { key: 'hostname', label: 'Hostname', type: 'string', value: 'a' },
        { key: 'hostname', label: 'Duplicate', type: 'string', value: 'b' },
      ]),
    ).toThrow(/Duplicate inspector property key/);
  });

  it('rejects invalid property types and values', () => {
    const inspector = new Inspector();
    expect(() =>
      inspector.selectTarget('id', 'Name', [
        { key: 'bad', label: 'Bad', type: 'invalid' as InspectorProperty['type'], value: null },
      ]),
    ).toThrow(/Invalid inspector property type/);

    expect(() =>
      inspector.selectTarget('id', 'Name', [
        { key: 'port', label: 'Port', type: 'number', value: 'not-number' },
      ]),
    ).toThrow(/expects a finite number value/);
  });

  it('returns properties and values as deep copies', () => {
    const inspector = createInspector();
    const properties = inspector.getProperties();
    properties[0].value = 'modified';
    expect(inspector.getPropertyValue('hostname')).toBe('web01');

    const tags = inspector.getPropertyValue('tags') as string[];
    tags.push('mutated');
    expect(inspector.getPropertyValue('tags')).toEqual(['web', 'production']);
  });

  it('retrieves a property by key', () => {
    const inspector = createInspector();
    expect(inspector.getProperty('port').value).toBe(443);
    expect(inspector.getProperty('port').category).toBe('Network');
  });

  it('throws when no target is selected', () => {
    const inspector = new Inspector();
    expect(() => inspector.getProperties()).toThrow(/No inspector target selected/);
    expect(() => inspector.setPropertyValue('key', 'value')).toThrow(/No inspector target selected/);
  });

  it('sets a property value and tracks modification', () => {
    const inspector = createInspector();
    inspector.setPropertyValue('hostname', 'web02');
    expect(inspector.getPropertyValue('hostname')).toBe('web02');
    expect(inspector.isPropertyModified('hostname')).toBe(true);
    expect(inspector.isPropertyModified('port')).toBe(false);
  });

  it('rejects setting an incorrect property value type', () => {
    const inspector = createInspector();
    expect(() => inspector.setPropertyValue('port', '443')).toThrow(/expects a finite number value/);
  });

  it('resets a single property to its original value', () => {
    const inspector = createInspector();
    inspector.setPropertyValue('hostname', 'web02');
    inspector.resetProperty('hostname');
    expect(inspector.getPropertyValue('hostname')).toBe('web01');
    expect(inspector.isPropertyModified('hostname')).toBe(false);
  });

  it('resets all properties to their original values', () => {
    const inspector = createInspector();
    inspector.setPropertyValue('hostname', 'web02');
    inspector.setPropertyValue('port', 8443);
    inspector.resetAllProperties();
    expect(inspector.getPropertyValue('hostname')).toBe('web01');
    expect(inspector.getPropertyValue('port')).toBe(443);
  });

  it('lists categories sorted alphabetically', () => {
    const inspector = createInspector();
    expect(inspector.listCategories()).toEqual(['Configuration', 'Identity', 'Network']);
  });

  it('filters properties by category', () => {
    const inspector = createInspector();
    expect(inspector.getProperties('Identity').map((property) => property.key)).toEqual(['hostname']);
  });

  it('searches properties by key, label, type, category, and description', () => {
    const inspector = createInspector();
    expect(inspector.search('hostname').map((property) => property.key)).toEqual(['hostname']);
    expect(inspector.search('Port').map((property) => property.key)).toEqual(['port']);
    expect(inspector.search('configuration').map((property) => property.key)).toEqual([
      'enabled',
      'metadata',
      'tags',
    ]);
  });

  it('clears selection', () => {
    const inspector = createInspector();
    inspector.clearSelection();
    expect(inspector.getSelectedTargetId()).toBeUndefined();
    expect(() => inspector.getProperties()).toThrow(/No inspector target selected/);
  });
});
