/**
 * EvidenceCollection
 * -------------------
 * Manages a set of evidence items and allows querying by type, source, or time.
 */

import { Evidence, createEvidence } from './Evidence.js';
import { EvidenceType } from './EvidenceType.js';

export class EvidenceCollection {
  private items: Map<string, Evidence> = new Map();

  add(evidence: Evidence): void {
    if (this.items.has(evidence.id)) {
      throw new Error(`Evidence with id "${evidence.id}" already exists.`);
    }
    this.items.set(evidence.id, evidence);
  }

  remove(id: string): void {
    if (!this.items.has(id)) {
      throw new Error(`Evidence with id "${id}" does not exist.`);
    }
    this.items.delete(id);
  }

  get(id: string): Evidence | undefined {
    return this.items.get(id);
  }

  getAll(): Evidence[] {
    return Array.from(this.items.values());
  }

  findByType(type: EvidenceType): Evidence[] {
    return this.getAll().filter((evidence) => evidence.type === type);
  }

  findBySource(sourceId: string): Evidence[] {
    return this.getAll().filter((evidence) => evidence.sourceId === sourceId);
  }

  findByTimeRange(start: number, end: number): Evidence[] {
    return this.getAll().filter(
      (evidence) =>
        evidence.timestamp !== undefined &&
        evidence.timestamp >= start &&
        evidence.timestamp <= end,
    );
  }

  clear(): void {
    this.items.clear();
  }

  toJSON(): Evidence[] {
    return this.getAll();
  }
}
