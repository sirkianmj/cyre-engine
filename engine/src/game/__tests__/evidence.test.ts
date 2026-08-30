import { describe, it, expect } from 'vitest';
import {
  EvidenceType,
  ALL_EVIDENCE_TYPES,
  createEvidence,
  EvidenceCollection,
} from '../index.js';

describe('EvidenceType', () => {
  it('has expected types', () => {
    expect(ALL_EVIDENCE_TYPES).toContain(EvidenceType.Log);
    expect(ALL_EVIDENCE_TYPES).toContain(EvidenceType.NetworkRecord);
  });
});

describe('createEvidence', () => {
  it('creates a valid evidence object', () => {
    const evidence = createEvidence(
      'e1',
      EvidenceType.AuthenticationEvent,
      'Failed login',
      'Multiple failed login attempts from 10.0.0.50',
      { sourceId: 'host1', timestamp: 1000 },
    );
    expect(evidence.id).toBe('e1');
    expect(evidence.type).toBe(EvidenceType.AuthenticationEvent);
    expect(evidence.sourceId).toBe('host1');
    expect(evidence.timestamp).toBe(1000);
  });

  it('throws on empty id', () => {
    expect(() =>
      createEvidence('', EvidenceType.Log, 'Title', 'Description'),
    ).toThrow(/non-empty/);
  });

  it('throws on invalid type', () => {
    expect(() =>
      createEvidence('e1', 'invalid' as EvidenceType, 'Title', 'Description'),
    ).toThrow(/Invalid evidence type/);
  });

  it('throws on empty title or description', () => {
    expect(() => createEvidence('e1', EvidenceType.Log, '', 'Desc')).toThrow(/non-empty/);
    expect(() => createEvidence('e1', EvidenceType.Log, 'Title', '')).toThrow(/non-empty/);
  });

  it('throws on non-integer timestamp', () => {
    expect(() =>
      createEvidence('e1', EvidenceType.Log, 'Title', 'Desc', { timestamp: 1.5 }),
    ).toThrow(/integer/);
  });
});

describe('EvidenceCollection', () => {
  it('adds and retrieves evidence', () => {
    const collection = new EvidenceCollection();
    const evidence = createEvidence('e1', EvidenceType.Log, 'Log', 'System log');
    collection.add(evidence);
    expect(collection.get('e1')).toBe(evidence);
    expect(collection.getAll()).toHaveLength(1);
  });

  it('throws on duplicate add', () => {
    const collection = new EvidenceCollection();
    collection.add(createEvidence('e1', EvidenceType.Log, 'Log', 'Desc'));
    expect(() =>
      collection.add(createEvidence('e1', EvidenceType.Log, 'Duplicate', 'Desc')),
    ).toThrow(/already exists/);
  });

  it('filters by type', () => {
    const collection = new EvidenceCollection();
    collection.add(createEvidence('e1', EvidenceType.Log, 'Log', 'Desc'));
    collection.add(createEvidence('e2', EvidenceType.Alert, 'Alert', 'Desc'));
    expect(collection.findByType(EvidenceType.Log)).toHaveLength(1);
  });

  it('filters by source', () => {
    const collection = new EvidenceCollection();
    collection.add(createEvidence('e1', EvidenceType.Log, 'Log', 'Desc', { sourceId: 'host1' }));
    collection.add(createEvidence('e2', EvidenceType.Log, 'Log2', 'Desc', { sourceId: 'host2' }));
    expect(collection.findBySource('host1')).toHaveLength(1);
  });

  it('filters by time range', () => {
    const collection = new EvidenceCollection();
    collection.add(createEvidence('e1', EvidenceType.Log, 'Log', 'Desc', { timestamp: 100 }));
    collection.add(createEvidence('e2', EvidenceType.Log, 'Log2', 'Desc', { timestamp: 200 }));
    collection.add(createEvidence('e3', EvidenceType.Log, 'Log3', 'Desc', { timestamp: 300 }));
    expect(collection.findByTimeRange(150, 250)).toHaveLength(1);
  });

  it('removes evidence', () => {
    const collection = new EvidenceCollection();
    collection.add(createEvidence('e1', EvidenceType.Log, 'Log', 'Desc'));
    collection.remove('e1');
    expect(collection.get('e1')).toBeUndefined();
  });
});
