import { UIComponent, type UIState } from './UIComponent.js';
import type { GameUIEvidenceItem } from './GameUIStateTypes.js';
import {
  deepClone,
  validateGameUIEvidenceItem,
} from './GameUIUtils.js';

interface EvidencePanelState extends UIState {
  items: GameUIEvidenceItem[];
  selectedId?: string;
  filterType?: string;
}

export class EvidencePanelUI extends UIComponent<EvidencePanelState> {
  constructor(initialItems: GameUIEvidenceItem[] = []) {
    super({ items: [], selectedId: undefined, filterType: undefined });
    this.setEvidence(initialItems);
  }

  setEvidence(items: GameUIEvidenceItem[]): void {
    if (!Array.isArray(items)) {
      throw new Error('Evidence items must be an array.');
    }
    const copies = items.map((item) => {
      validateGameUIEvidenceItem(item);
      return deepClone(item);
    });
    this.setState({ items: copies });
  }

  addEvidence(item: GameUIEvidenceItem): void {
    validateGameUIEvidenceItem(item);
    const exists = this.state.items.some((entry) => entry.id === item.id);
    if (exists) {
      throw new Error(`Evidence "${item.id}" already exists in panel.`);
    }
    this.setState({ items: [...this.state.items, deepClone(item)] });
  }

  selectEvidence(id: string): void {
    if (!id || id.trim() === '') {
      throw new Error('Evidence id is required.');
    }
    if (!this.state.items.some((item) => item.id === id)) {
      throw new Error(`Evidence "${id}" does not exist in panel.`);
    }
    this.setState({ selectedId: id });
  }

  clearSelection(): void {
    this.setState({ selectedId: undefined });
  }

  setFilterType(type: string | undefined): void {
    if (type !== undefined && type.trim() === '') {
      throw new Error('Evidence filter type cannot be empty if provided.');
    }
    this.setState({ filterType: type });
  }

  getFilteredItems(): GameUIEvidenceItem[] {
    if (!this.state.filterType) {
      return this.state.items.map((item) => deepClone(item));
    }
    return this.state.items
      .filter((item) => item.type === this.state.filterType)
      .map((item) => deepClone(item));
  }

  render(): Record<string, unknown> {
    return {
      type: 'evidence-panel',
      selectedId: this.state.selectedId,
      filterType: this.state.filterType,
      items: this.getFilteredItems(),
    };
  }
}
