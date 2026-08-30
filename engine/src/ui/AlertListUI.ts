import { UIComponent, type UIState } from './UIComponent.js';
import type { GameUIAlertItem } from './GameUIStateTypes.js';
import {
  deepClone,
  validateGameUIAlertItem,
} from './GameUIUtils.js';

interface AlertListState extends UIState {
  items: GameUIAlertItem[];
  selectedId?: string;
  filterStatus?: string;
}

export class AlertListUI extends UIComponent<AlertListState> {
  constructor(initialItems: GameUIAlertItem[] = []) {
    super({ items: [], selectedId: undefined, filterStatus: undefined });
    this.setAlerts(initialItems);
  }

  setAlerts(items: GameUIAlertItem[]): void {
    if (!Array.isArray(items)) {
      throw new Error('Alert items must be an array.');
    }
    const copies = items.map((item) => {
      validateGameUIAlertItem(item);
      return deepClone(item);
    });
    this.setState({ items: copies });
  }

  addAlert(item: GameUIAlertItem): void {
    validateGameUIAlertItem(item);
    if (this.state.items.some((entry) => entry.id === item.id)) {
      throw new Error(`Alert "${item.id}" already exists in list.`);
    }
    this.setState({ items: [...this.state.items, deepClone(item)] });
  }

  selectAlert(id: string): void {
    if (!id || id.trim() === '') {
      throw new Error('Alert id is required.');
    }
    if (!this.state.items.some((alert) => alert.id === id)) {
      throw new Error(`Alert "${id}" does not exist in list.`);
    }
    this.setState({ selectedId: id });
  }

  acknowledgeAlert(id: string): void {
    const index = this.state.items.findIndex((alert) => alert.id === id);
    if (index < 0) {
      throw new Error(`Alert "${id}" does not exist in list.`);
    }
    const alert = this.state.items[index];
    if (alert.status !== 'new') {
      throw new Error(`Cannot acknowledge alert in status "${alert.status}".`);
    }
    const updated = this.state.items.map((entry, i) =>
      i === index ? { ...entry, status: 'acknowledged' as const } : entry,
    );
    this.setState({ items: updated });
  }

  setFilterStatus(status: string | undefined): void {
    if (status !== undefined && status.trim() === '') {
      throw new Error('Alert filter status cannot be empty if provided.');
    }
    this.setState({ filterStatus: status });
  }

  getFilteredItems(): GameUIAlertItem[] {
    if (!this.state.filterStatus) {
      return this.state.items.map((item) => deepClone(item));
    }
    return this.state.items
      .filter((item) => item.status === this.state.filterStatus)
      .map((item) => deepClone(item));
  }

  render(): Record<string, unknown> {
    return {
      type: 'alert-list',
      selectedId: this.state.selectedId,
      filterStatus: this.state.filterStatus,
      items: this.getFilteredItems(),
    };
  }
}
