export type TimelineEntryType = 'event' | 'alert' | 'evidence' | 'action' | 'phase';

export interface TimelineEntry {
  id: string;
  timestamp: number;
  label: string;
  type: TimelineEntryType;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export class TimelineEditor {
  private readonly entries = new Map<string, TimelineEntry>();

  addEntry(entry: TimelineEntry): void {
    this.validateEntry(entry);
    if (this.entries.has(entry.id)) {
      throw new Error(`Timeline entry "${entry.id}" already exists.`);
    }
    this.entries.set(entry.id, this.copyEntry(entry));
  }

  getEntry(entryId: string): TimelineEntry {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error(`Timeline entry "${entryId}" does not exist.`);
    }
    return this.copyEntry(entry);
  }

  listEntries(): TimelineEntry[] {
    return [...this.entries.values()]
      .map((entry) => this.copyEntry(entry))
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  }

  removeEntry(entryId: string): void {
    if (!this.entries.has(entryId)) {
      throw new Error(`Timeline entry "${entryId}" does not exist.`);
    }
    this.entries.delete(entryId);
  }

  updateTimestamp(entryId: string, timestamp: number): void {
    const entry = this.requireEntry(entryId);
    this.validateTimestamp(timestamp);
    this.entries.set(entryId, { ...entry, timestamp });
  }

  updateLabel(entryId: string, label: string): void {
    const entry = this.requireEntry(entryId);
    if (!label || label.trim() === '') {
      throw new Error('Timeline entry label is required.');
    }
    this.entries.set(entryId, { ...entry, label });
  }

  findEntriesByType(type: TimelineEntryType): TimelineEntry[] {
    return this.listEntries().filter((entry) => entry.type === type);
  }

  findEntriesBetween(start: number, end: number): TimelineEntry[] {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error('Timeline range start and end must be finite numbers.');
    }
    if (start > end) {
      throw new Error('Timeline range start must not be greater than end.');
    }

    return this.listEntries().filter(
      (entry) => entry.timestamp >= start && entry.timestamp <= end,
    );
  }

  search(query: string): TimelineEntry[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return this.listEntries();
    }

    return this.listEntries().filter((entry) => {
      const searchableText = [
        entry.id,
        entry.label,
        entry.type,
        entry.sourceId ?? '',
        entry.targetId ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }

  getEarliestTimestamp(): number | undefined {
    const earliest = this.listEntries()[0];
    return earliest?.timestamp;
  }

  getLatestTimestamp(): number | undefined {
    const entries = this.listEntries();
    return entries.length > 0 ? entries[entries.length - 1].timestamp : undefined;
  }

  private requireEntry(entryId: string): TimelineEntry {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error(`Timeline entry "${entryId}" does not exist.`);
    }
    return entry;
  }

  private validateEntry(entry: TimelineEntry): void {
    if (!entry.id || entry.id.trim() === '') {
      throw new Error('Timeline entry id is required.');
    }
    if (!entry.label || entry.label.trim() === '') {
      throw new Error('Timeline entry label is required.');
    }
    if (!['event', 'alert', 'evidence', 'action', 'phase'].includes(entry.type)) {
      throw new Error(`Invalid timeline entry type "${entry.type}".`);
    }
    this.validateTimestamp(entry.timestamp);
  }

  private validateTimestamp(timestamp: number): void {
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw new Error('Timeline entry timestamp must be a non-negative finite number.');
    }
  }

  private copyEntry(entry: TimelineEntry): TimelineEntry {
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      label: entry.label,
      type: entry.type,
      sourceId: entry.sourceId,
      targetId: entry.targetId,
      data: entry.data ? JSON.parse(JSON.stringify(entry.data)) : undefined,
    };
  }
}
