import { describe, it, expect } from 'vitest';
import {
  Alert,
  AlertStatus,
  InvestigationState,
  InvestigationPhase,
  Hypothesis,
} from '../index.js';
import { DefensiveAction } from '../../cyber/index.js';

describe('Alert', () => {
  it('creates alert with default status new', () => {
    const alert = new Alert('a1', 'Suspicious login', 'Multiple failed logins', { severity: 'high' });
    expect(alert.getStatus()).toBe(AlertStatus.New);
    expect(alert.severity).toBe('high');
  });

  it('throws on empty title', () => {
    expect(() => new Alert('a1', '', 'desc')).toThrow(/non-empty/);
  });

  it('lifecycle transitions: acknowledge -> investigate -> contain -> recover -> resolve', () => {
    const alert = new Alert('a1', 'Alert', 'Desc');
    alert.acknowledge();
    expect(alert.getStatus()).toBe(AlertStatus.Acknowledged);
    alert.startInvestigation();
    expect(alert.getStatus()).toBe(AlertStatus.Investigating);
    alert.contain();
    expect(alert.getStatus()).toBe(AlertStatus.Contained);
    alert.recover();
    expect(alert.getStatus()).toBe(AlertStatus.Recovered);
    alert.resolve();
    expect(alert.getStatus()).toBe(AlertStatus.Resolved);
  });

  it('throws on invalid transition', () => {
    const alert = new Alert('a1', 'Alert', 'Desc');
    expect(() => alert.contain()).toThrow(/Cannot contain/);
  });
});

describe('Hypothesis', () => {
  it('creates hypothesis with default confidence 0.5', () => {
    const hyp = new Hypothesis('h1', 'Attacker used phishing');
    expect(hyp.getConfidence()).toBe(0.5);
    expect(hyp.getStatus()).toBe('proposed');
  });

  it('updates confidence', () => {
    const hyp = new Hypothesis('h1', 'Attacker used phishing');
    hyp.updateConfidence(0.8);
    expect(hyp.getConfidence()).toBe(0.8);
  });

  it('throws on confidence outside [0,1]', () => {
    expect(() => new Hypothesis('h1', 'desc', { confidence: 1.5 })).toThrow(/between 0 and 1/);
    const hyp = new Hypothesis('h2', 'desc');
    expect(() => hyp.updateConfidence(-0.1)).toThrow(/between 0 and 1/);
  });

  it('confirms and rejects', () => {
    const hyp = new Hypothesis('h1', 'desc');
    hyp.confirm();
    expect(hyp.getStatus()).toBe('confirmed');
    expect(() => hyp.updateConfidence(0.9)).toThrow(/status/);
    const hyp2 = new Hypothesis('h2', 'desc');
    hyp2.reject();
    expect(hyp2.getStatus()).toBe('rejected');
  });
});

describe('InvestigationState', () => {
  it('starts in idle phase', () => {
    const state = new InvestigationState();
    expect(state.getPhase()).toBe(InvestigationPhase.Idle);
  });

  it('adds alert and moves to alert received', () => {
    const state = new InvestigationState();
    const alert = new Alert('a1', 'Alert', 'Desc');
    state.addAlert(alert);
    expect(state.getPhase()).toBe(InvestigationPhase.AlertReceived);
    expect(state.getAlerts()).toHaveLength(1);
  });

  it('acknowledges and starts investigation', () => {
    const state = new InvestigationState();
    const alert = new Alert('a1', 'Alert', 'Desc');
    state.addAlert(alert);
    state.acknowledgeAlert('a1');
    expect(alert.getStatus()).toBe(AlertStatus.Acknowledged);
    state.startInvestigation('a1');
    expect(alert.getStatus()).toBe(AlertStatus.Investigating);
    expect(state.getPhase()).toBe(InvestigationPhase.Investigating);
  });

  it('adds evidence and hypotheses', () => {
    const state = new InvestigationState();
    const alert = new Alert('a1', 'Alert', 'Desc');
    state.addAlert(alert);
    state.startInvestigation('a1');
    state.addEvidence('e1');
    state.addEvidence('e2');
    const hyp = new Hypothesis('h1', 'Phishing attack', { linkedEvidenceIds: ['e1'] });
    state.addHypothesis(hyp);
    expect(state.getEvidenceIds()).toEqual(['e1', 'e2']);
    expect(state.getHypotheses()).toHaveLength(1);
    expect(state.getPhase()).toBe(InvestigationPhase.HypothesisForming);
  });

  it('identifies attack path', () => {
    const state = new InvestigationState();
    const alert = new Alert('a1', 'Alert', 'Desc');
    state.addAlert(alert);
    state.startInvestigation('a1');
    state.identifyAttackPath('internet', 'database');
    expect(state.getAttackPath()).toEqual({ source: 'internet', target: 'database' });
    expect(state.getPhase()).toBe(InvestigationPhase.AttackPathIdentification);
  });

  it('applies containment and recovery', () => {
    const state = new InvestigationState();
    const alert = new Alert('a1', 'Alert', 'Desc');
    state.addAlert(alert);
    state.startInvestigation('a1');
    state.applyContainment(DefensiveAction.Isolate, 'host1', 100);
    expect(state.getContainmentActions()).toHaveLength(1);
    expect(state.getPhase()).toBe(InvestigationPhase.Containment);
    expect(alert.getStatus()).toBe(AlertStatus.Contained);

    state.applyRecovery(DefensiveAction.Recover, 'host1', 200);
    expect(state.getRecoveryActions()).toHaveLength(1);
    expect(state.getPhase()).toBe(InvestigationPhase.Recovery);
    expect(alert.getStatus()).toBe(AlertStatus.Recovered);
  });

  it('completes investigation and resolves alerts', () => {
    const state = new InvestigationState();
    const alert = new Alert('a1', 'Alert', 'Desc');
    state.addAlert(alert);
    state.startInvestigation('a1');
    state.completeInvestigation();
    expect(state.getPhase()).toBe(InvestigationPhase.Complete);
    expect(alert.getStatus()).toBe(AlertStatus.Resolved);
  });

  it('throws when completing before start', () => {
    const state = new InvestigationState();
    expect(() => state.completeInvestigation()).toThrow(/not started/);
  });

  it('serialises to JSON', () => {
    const state = new InvestigationState();
    const alert = new Alert('a1', 'Alert', 'Desc');
    state.addAlert(alert);
    state.startInvestigation('a1');
    state.addEvidence('e1');
    const json = state.toJSON();
    expect(json.phase).toBe(InvestigationPhase.Investigating);
    expect(Array.isArray(json.alerts)).toBe(true);
  });
});
