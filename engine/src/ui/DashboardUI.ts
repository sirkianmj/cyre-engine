/**
 * DashboardUI
 * ------------
 * A simple 2D dashboard UI component that shows cyber state metrics.
 */

import { UIComponent, UIState } from './UIComponent.js';

interface DashboardState extends UIState {
  alertCount: number;
  compromisedHosts: number;
  investigationPhase: string;
  timestamp: number;
}

export class DashboardUI extends UIComponent<DashboardState> {
  constructor(initial: Partial<DashboardState> = {}) {
    super({
      alertCount: initial.alertCount ?? 0,
      compromisedHosts: initial.compromisedHosts ?? 0,
      investigationPhase: initial.investigationPhase ?? 'idle',
      timestamp: initial.timestamp ?? Date.now(),
    });
  }

  setAlertCount(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Alert count must be a non-negative integer.');
    }
    this.setState({ alertCount: count });
  }

  setCompromisedHosts(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Compromised hosts count must be a non-negative integer.');
    }
    this.setState({ compromisedHosts: count });
  }

  setInvestigationPhase(phase: string): void {
    if (!phase || phase.trim() === '') {
      throw new Error('Investigation phase cannot be empty.');
    }
    this.setState({ investigationPhase: phase });
  }

  render(): Record<string, unknown> {
    return {
      type: 'dashboard',
      alertCount: this.state.alertCount,
      compromisedHosts: this.state.compromisedHosts,
      investigationPhase: this.state.investigationPhase,
      timestamp: this.state.timestamp,
    };
  }
}
