/**
 * InvestigationState
 * -------------------
 * Represents the state of a single cyber incident investigation.
 * Manages alerts, evidence, hypotheses, containment/recovery actions,
 * and the current investigation phase.
 */

import { Alert } from './Alert.js';
import { AlertStatus } from './AlertStatus.js';
import { InvestigationPhase } from './InvestigationPhase.js';
import { Hypothesis } from './Hypothesis.js';
import { DefensiveAction } from '../cyber/index.js';

export interface DefensiveActionRecord {
  action: DefensiveAction;
  targetId?: string;
  timestamp: number;
}

export class InvestigationState {
  private alerts: Map<string, Alert> = new Map();
  private hypotheses: Map<string, Hypothesis> = new Map();
  private evidenceIds: Set<string> = new Set();
  private containmentActions: DefensiveActionRecord[] = [];
  private recoveryActions: DefensiveActionRecord[] = [];
  private phase: InvestigationPhase = InvestigationPhase.Idle;
  private attackPath: { source: string; target: string } | null = null;

  constructor() {}

  getPhase(): InvestigationPhase {
    return this.phase;
  }

  // ---------- Alerts ----------

  addAlert(alert: Alert): void {
    if (this.alerts.has(alert.id)) {
      throw new Error(`Alert "${alert.id}" already exists.`);
    }
    this.alerts.set(alert.id, alert);
    this.phase = InvestigationPhase.AlertReceived;
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.getAlert(alertId);
    if (!alert) {
      throw new Error(`Alert "${alertId}" not found.`);
    }
    alert.acknowledge();
  }

  startInvestigation(alertId?: string): void {
    if (alertId) {
      const alert = this.getAlert(alertId);
      if (!alert) {
        throw new Error(`Alert "${alertId}" not found.`);
      }
      alert.startInvestigation();
    }
    this.phase = InvestigationPhase.Investigating;
  }

  // ---------- Evidence ----------

  addEvidence(evidenceId: string): void {
    if (!evidenceId || evidenceId.trim() === '') {
      throw new Error('Evidence ID must be a non-empty string.');
    }
    if (this.evidenceIds.has(evidenceId)) {
      throw new Error(`Evidence "${evidenceId}" already added.`);
    }
    this.evidenceIds.add(evidenceId);
  }

  getEvidenceIds(): string[] {
    return Array.from(this.evidenceIds);
  }

  hasEvidence(evidenceId: string): boolean {
    return this.evidenceIds.has(evidenceId);
  }

  // ---------- Hypotheses ----------

  addHypothesis(hypothesis: Hypothesis): void {
    if (this.hypotheses.has(hypothesis.id)) {
      throw new Error(`Hypothesis "${hypothesis.id}" already exists.`);
    }
    this.hypotheses.set(hypothesis.id, hypothesis);
    this.phase = InvestigationPhase.HypothesisForming;
  }

  getHypothesis(id: string): Hypothesis | undefined {
    return this.hypotheses.get(id);
  }

  getHypotheses(): Hypothesis[] {
    return Array.from(this.hypotheses.values());
  }

  updateHypothesisConfidence(id: string, newConfidence: number): void {
    const hypothesis = this.hypotheses.get(id);
    if (!hypothesis) {
      throw new Error(`Hypothesis "${id}" not found.`);
    }
    hypothesis.updateConfidence(newConfidence);
  }

  confirmHypothesis(id: string): void {
    const hypothesis = this.hypotheses.get(id);
    if (!hypothesis) {
      throw new Error(`Hypothesis "${id}" not found.`);
    }
    hypothesis.confirm();
  }

  rejectHypothesis(id: string): void {
    const hypothesis = this.hypotheses.get(id);
    if (!hypothesis) {
      throw new Error(`Hypothesis "${id}" not found.`);
    }
    hypothesis.reject();
  }

  // ---------- Attack Path ----------

  identifyAttackPath(source: string, target: string): void {
    if (!source || !target) {
      throw new Error('Attack path source and target must be non-empty strings.');
    }
    this.attackPath = { source, target };
    this.phase = InvestigationPhase.AttackPathIdentification;
  }

  getAttackPath(): { source: string; target: string } | null {
    return this.attackPath;
  }

  // ---------- Containment / Recovery ----------

  applyContainment(action: DefensiveAction, targetId?: string, timestamp: number = Date.now()): void {
    if (!action) {
      throw new Error('Containment action cannot be empty.');
    }
    this.containmentActions.push({ action, targetId, timestamp });
    this.phase = InvestigationPhase.Containment;
    // Also update all active alerts to contained if they are investigating
    for (const alert of this.alerts.values()) {
      if (alert.getStatus() === AlertStatus.Investigating) {
        alert.contain();
      }
    }
  }

  applyRecovery(action: DefensiveAction, targetId?: string, timestamp: number = Date.now()): void {
    if (!action) {
      throw new Error('Recovery action cannot be empty.');
    }
    this.recoveryActions.push({ action, targetId, timestamp });
    this.phase = InvestigationPhase.Recovery;
    // Update contained alerts to recovered
    for (const alert of this.alerts.values()) {
      if (alert.getStatus() === AlertStatus.Contained) {
        alert.recover();
      }
    }
  }

  getContainmentActions(): DefensiveActionRecord[] {
    return [...this.containmentActions];
  }

  getRecoveryActions(): DefensiveActionRecord[] {
    return [...this.recoveryActions];
  }

  // ---------- Completion ----------

  completeInvestigation(): void {
    if (this.phase === InvestigationPhase.Idle) {
      throw new Error('Cannot complete investigation that has not started.');
    }
    // All alerts should be resolved or false positive
    for (const alert of this.alerts.values()) {
      if (alert.getStatus() !== AlertStatus.Resolved && alert.getStatus() !== AlertStatus.FalsePositive) {
        alert.resolve();
      }
    }
    this.phase = InvestigationPhase.Complete;
  }

  toJSON(): Record<string, unknown> {
    return {
      phase: this.phase,
      alerts: this.getAlerts().map((a) => a.toJSON()),
      evidenceIds: this.getEvidenceIds(),
      hypotheses: this.getHypotheses().map((h) => h.toJSON()),
      attackPath: this.attackPath,
      containmentActions: this.containmentActions,
      recoveryActions: this.recoveryActions,
    };
  }
}
