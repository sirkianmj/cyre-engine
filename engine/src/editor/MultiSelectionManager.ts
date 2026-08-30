export interface SelectionItem {
  id: string;
  type: string;
  name?: string;
}

export class MultiSelectionManager {
  private readonly selectedItems = new Map<string, SelectionItem>();

  select(item: SelectionItem): void {
    this.validateItem(item);
    this.selectedItems.clear();
    this.selectedItems.set(item.id, this.copyItem(item));
  }

  selectMany(items: SelectionItem[]): void {
    if (!Array.isArray(items)) {
      throw new Error('Selected items must be an array.');
    }

    this.selectedItems.clear();
    this.addMany(items);
  }

  add(item: SelectionItem): void {
    this.validateItem(item);
    this.selectedItems.set(item.id, this.copyItem(item));
  }

  addMany(items: SelectionItem[]): void {
    if (!Array.isArray(items)) {
      throw new Error('Selected items must be an array.');
    }

    for (const item of items) {
      this.add(item);
    }
  }

  toggle(item: SelectionItem): void {
    this.validateItem(item);
    if (this.selectedItems.has(item.id)) {
      this.selectedItems.delete(item.id);
    } else {
      this.selectedItems.set(item.id, this.copyItem(item));
    }
  }

  remove(itemId: string): void {
    if (!itemId || itemId.trim() === '') {
      throw new Error('Selection item id is required.');
    }
    this.selectedItems.delete(itemId);
  }

  clear(): void {
    this.selectedItems.clear();
  }

  has(itemId: string): boolean {
    if (!itemId || itemId.trim() === '') {
      throw new Error('Selection item id is required.');
    }
    return this.selectedItems.has(itemId);
  }

  getSelectedIds(): string[] {
    return [...this.selectedItems.keys()];
  }

  getSelectedItems(): SelectionItem[] {
    return [...this.selectedItems.values()].map((item) => this.copyItem(item));
  }

  getSelectionCount(): number {
    return this.selectedItems.size;
  }

  isMultiSelection(): boolean {
    return this.selectedItems.size > 1;
  }

  isEmpty(): boolean {
    return this.selectedItems.size === 0;
  }

  filterByType(type: string): SelectionItem[] {
    if (!type || type.trim() === '') {
      throw new Error('Selection item type is required.');
    }
    return this.getSelectedItems().filter((item) => item.type === type);
  }

  getSelectionTypes(): string[] {
    const types = new Set<string>();
    for (const item of this.selectedItems.values()) {
      types.add(item.type);
    }
    return [...types].sort();
  }

  private validateItem(item: SelectionItem): void {
    if (!item.id || item.id.trim() === '') {
      throw new Error('Selection item id is required.');
    }
    if (!item.type || item.type.trim() === '') {
      throw new Error('Selection item type is required.');
    }
  }

  private copyItem(item: SelectionItem): SelectionItem {
    return {
      id: item.id,
      type: item.type,
      name: item.name,
    };
  }
}
