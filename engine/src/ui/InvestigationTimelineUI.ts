import { UIComponent, type UIState } from './UIComponent.js';
import type { GameUITimelineEvent } from './GameUIStateTypes.js';
import {
  deepClone,
  validateGameUITimelineEvent,
} from './GameUIUtils.js';

interface TimelineState extends UIState {
  events: GameUITimelineEvent[];
  selectedId?: string;
}

export class InvestigationTimelineUI extends UIComponent<TimelineState> {
  constructor(initialEvents: GameUITimelineEvent[] = []) {
    super({ events: [], selectedId: undefined });
    this.setEvents(initialEvents);
  }

  setEvents(events: GameUITimelineEvent[]): void {
    if (!Array.isArray(events)) {
      throw new Error('Timeline events must be an array.');
    }
    const copies = events.map((event) => {
      validateGameUITimelineEvent(event);
      return deepClone(event);
    });
    copies.sort((a, b) => a.timestamp - b.timestamp);
    this.setState({ events: copies });
  }

  addEvent(event: GameUITimelineEvent): void {
    validateGameUITimelineEvent(event);
    if (this.state.events.some((entry) => entry.id === event.id)) {
      throw new Error(`Timeline event "${event.id}" already exists.`);
    }
    const events = [...this.state.events, deepClone(event)];
    events.sort((a, b) => a.timestamp - b.timestamp);
    this.setState({ events });
  }

  selectEvent(id: string): void {
    if (!id || id.trim() === '') {
      throw new Error('Timeline event id is required.');
    }
    if (!this.state.events.some((event) => event.id === id)) {
      throw new Error(`Timeline event "${id}" does not exist.`);
    }
    this.setState({ selectedId: id });
  }

  clearSelection(): void {
    this.setState({ selectedId: undefined });
  }

  getSortedEvents(): GameUITimelineEvent[] {
    return [...this.state.events].sort((a, b) => a.timestamp - b.timestamp)
      .map((event) => deepClone(event));
  }

  render(): Record<string, unknown> {
    return {
      type: 'investigation-timeline',
      selectedId: this.state.selectedId,
      events: this.getSortedEvents(),
    };
  }
}
