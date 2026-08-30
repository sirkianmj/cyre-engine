import { UIComponent, type UIState } from './UIComponent.js';
import type {
  GameUIAlertItem,
  GameUIEvidenceItem,
  GameUIMissionState,
  GameUITimelineEvent,
} from './GameUIStateTypes.js';
import {
  deepClone,
  validateGameUIAlertItem,
  validateGameUIEvidenceItem,
  validateGameUIMissionState,
  validateGameUITimelineEvent,
} from './GameUIUtils.js';

export type GameUIPanel = 'evidence' | 'alerts' | 'timeline' | 'mission';

interface GameUIWorkspaceState extends UIState {
  evidence: GameUIEvidenceItem[];
  alerts: GameUIAlertItem[];
  timeline: GameUITimelineEvent[];
  mission?: GameUIMissionState;
  activePanel: GameUIPanel;
  selectedEvidenceId?: string;
  selectedAlertId?: string;
  selectedTimelineEventId?: string;
}

export class GameUIWorkspace extends UIComponent<GameUIWorkspaceState> {
  constructor() {
    super({
      evidence: [],
      alerts: [],
      timeline: [],
      mission: undefined,
      activePanel: 'evidence',
      selectedEvidenceId: undefined,
      selectedAlertId: undefined,
      selectedTimelineEventId: undefined,
    });
  }

  setEvidence(items: GameUIEvidenceItem[]): void {
    if (!Array.isArray(items)) {
      throw new Error('Evidence items must be an array.');
    }
    this.setState({
      evidence: items.map((item) => {
        validateGameUIEvidenceItem(item);
        return deepClone(item);
      }),
    });
  }

  addEvidence(item: GameUIEvidenceItem): void {
    validateGameUIEvidenceItem(item);
    if (this.state.evidence.some((entry) => entry.id === item.id)) {
      throw new Error(`Evidence "${item.id}" already exists in workspace.`);
    }
    this.setState({ evidence: [...this.state.evidence, deepClone(item)] });
  }

  setAlerts(items: GameUIAlertItem[]): void {
    if (!Array.isArray(items)) {
      throw new Error('Alert items must be an array.');
    }
    this.setState({
      alerts: items.map((item) => {
        validateGameUIAlertItem(item);
        return deepClone(item);
      }),
    });
  }

  addAlert(item: GameUIAlertItem): void {
    validateGameUIAlertItem(item);
    if (this.state.alerts.some((entry) => entry.id === item.id)) {
      throw new Error(`Alert "${item.id}" already exists in workspace.`);
    }
    this.setState({ alerts: [...this.state.alerts, deepClone(item)] });
  }

  setTimeline(events: GameUITimelineEvent[]): void {
    if (!Array.isArray(events)) {
      throw new Error('Timeline events must be an array.');
    }
    const copies = events.map((event) => {
      validateGameUITimelineEvent(event);
      return deepClone(event);
    });
    copies.sort((a, b) => a.timestamp - b.timestamp);
    this.setState({ timeline: copies });
  }

  addTimelineEvent(event: GameUITimelineEvent): void {
    validateGameUITimelineEvent(event);
    if (this.state.timeline.some((entry) => entry.id === event.id)) {
      throw new Error(`Timeline event "${event.id}" already exists in workspace.`);
    }
    const events = [...this.state.timeline, deepClone(event)];
    events.sort((a, b) => a.timestamp - b.timestamp);
    this.setState({ timeline: events });
  }

  setMission(mission: GameUIMissionState): void {
    validateGameUIMissionState(mission);
    this.setState({ mission: deepClone(mission) });
  }

  setActivePanel(panel: GameUIPanel): void {
    const validPanels: GameUIPanel[] = ['evidence', 'alerts', 'timeline', 'mission'];
    if (!validPanels.includes(panel)) {
      throw new Error(`Invalid game UI panel "${panel}".`);
    }
    this.setState({ activePanel: panel });
  }

  selectEvidence(id: string): void {
    this.selectTrackedId(id, this.state.evidence, 'Evidence', 'selectedEvidenceId');
  }

  selectAlert(id: string): void {
    this.selectTrackedId(id, this.state.alerts, 'Alert', 'selectedAlertId');
  }

  selectTimelineEvent(id: string): void {
    this.selectTrackedId(
      id,
      this.state.timeline,
      'Timeline event',
      'selectedTimelineEventId',
    );
  }

  render(): Record<string, unknown> {
    return {
      type: 'game-ui-workspace',
      activePanel: this.state.activePanel,
      mission: this.state.mission ? deepClone(this.state.mission) : undefined,
      evidence: this.state.evidence.map((item) => deepClone(item)),
      alerts: this.state.alerts.map((item) => deepClone(item)),
      timeline: this.state.timeline.map((event) => deepClone(event)),
      selectedEvidenceId: this.state.selectedEvidenceId,
      selectedAlertId: this.state.selectedAlertId,
      selectedTimelineEventId: this.state.selectedTimelineEventId,
    };
  }

  private selectTrackedId(
    id: string,
    items: Array<{ id: string }>,
    label: string,
    key: keyof GameUIWorkspaceState,
  ): void {
    if (!id || id.trim() === '') {
      throw new Error(`${label} id is required.`);
    }
    if (!items.some((item) => item.id === id)) {
      throw new Error(`${label} "${id}" does not exist in workspace.`);
    }
    this.setState({ [key]: id } as Partial<GameUIWorkspaceState>);
  }
}
