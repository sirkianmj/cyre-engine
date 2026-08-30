import { UIComponent, type UIState } from './UIComponent.js';
import type { GameUIMissionState, GameUIObjective } from './GameUIStateTypes.js';
import {
  deepClone,
  validateGameUIMissionState,
} from './GameUIUtils.js';

interface MissionStatusState extends UIState {
  mission?: GameUIMissionState;
}

export class MissionStatusUI extends UIComponent<MissionStatusState> {
  constructor(mission?: GameUIMissionState) {
    super({ mission: undefined });
    if (mission !== undefined) {
      this.setMission(mission);
    }
  }

  setMission(mission: GameUIMissionState): void {
    validateGameUIMissionState(mission);
    this.setState({ mission: deepClone(mission) });
  }

  updateObjective(id: string, completed: boolean): void {
    const mission = this.state.mission;
    if (!mission) {
      throw new Error('No mission is configured.');
    }
    const index = mission.objectives.findIndex((objective) => objective.id === id);
    if (index < 0) {
      throw new Error(`Objective "${id}" does not exist in mission.`);
    }
    const objectives = mission.objectives.map((objective, i) =>
      i === index ? { ...objective, completed } : { ...objective },
    );
    this.setState({ mission: { ...mission, objectives } });
  }

  setStatus(status: GameUIMissionState['status']): void {
    const mission = this.state.mission;
    if (!mission) {
      throw new Error('No mission is configured.');
    }
    this.setState({ mission: { ...mission, status } });
  }

  getObjectives(): GameUIObjective[] {
    return this.state.mission ? deepClone(this.state.mission.objectives) : [];
  }

  render(): Record<string, unknown> {
    return {
      type: 'mission-status',
      mission: this.state.mission ? deepClone(this.state.mission) : undefined,
    };
  }
}
