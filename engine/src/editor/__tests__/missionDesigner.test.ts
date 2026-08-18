import { describe, it, expect } from 'vitest';
import { MissionDesigner } from '../MissionDesigner.js';

function createDesigner(): MissionDesigner {
  const designer = new MissionDesigner('mission-001', 'Compromised Employee Investigation');
  designer.addObjective({ id: 'obj-1', description: 'Identify compromised host', type: 'primary' });
  designer.addObjective({ id: 'obj-2', description: 'Trace attack path', type: 'secondary', optional: true });
  designer.addSuccessCondition({ id: 'success-1', description: 'Incident contained' });
  designer.addFailureCondition({ id: 'fail-1', description: 'Database compromised' });
  designer.addTrigger({ id: 'trigger-1', description: 'Suspicious login detected', eventType: 'authentication_event', conditionId: 'success-1' });
  designer.addAlert({ id: 'alert-1', title: 'Anomalous authentication', severity: 'high', message: 'Multiple anomalous authentication events detected' });
  designer.addEvidence({ id: 'ev-1', type: 'log', title: 'Failed login attempts', description: 'Multiple failed login attempts from external IP', sourceId: 'vpn', timestamp: 190 });
  designer.setTimeLimit(600000);
  designer.setScoringRules({
    accuracyWeight: 0.5,
    responseTimeWeight: 0.2,
    evidenceQualityWeight: 0.2,
    damagePenaltyWeight: 0.1,
  });
  return designer;
}

describe('MissionDesigner', () => {
  it('creates a mission design with id and name', () => {
    const designer = new MissionDesigner('mission-x', 'Test Mission');
    expect(designer.getId()).toBe('mission-x');
    expect(designer.getName()).toBe('Test Mission');
  });

  it('throws when id or name is missing', () => {
    expect(() => new MissionDesigner('', 'Bad')).toThrow(/id is required/);
    expect(() => new MissionDesigner('bad', '   ')).toThrow(/name is required/);
  });

  it('builds a complete mission design', () => {
    const design = createDesigner().build();
    expect(design.objectives).toHaveLength(2);
    expect(design.successConditions).toHaveLength(1);
    expect(design.failureConditions).toHaveLength(1);
    expect(design.triggers).toHaveLength(1);
    expect(design.alerts).toHaveLength(1);
    expect(design.evidence).toHaveLength(1);
    expect(design.timeLimitMs).toBe(600000);
    expect(design.scoringRules.accuracyWeight).toBe(0.5);
  });

  it('rejects duplicate objectives', () => {
    const designer = createDesigner();
    expect(() =>
      designer.addObjective({ id: 'obj-1', description: 'Duplicate', type: 'primary' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid objective type', () => {
    const designer = new MissionDesigner('m', 'Mission');
    expect(() =>
      designer.addObjective({ id: 'obj', description: 'Bad', type: 'invalid' as any }),
    ).toThrow(/Invalid mission objective type/);
  });

  it('rejects triggers with unknown condition ids', () => {
    const designer = new MissionDesigner('m', 'Mission');
    expect(() =>
      designer.addTrigger({
        id: 'trigger',
        description: 'Trigger',
        eventType: 'event',
        conditionId: 'missing',
      }),
    ).toThrow(/does not exist/);
  });

  it('rejects invalid alert severity', () => {
    const designer = new MissionDesigner('m', 'Mission');
    expect(() =>
      designer.addAlert({
        id: 'alert',
        title: 'Alert',
        severity: 'invalid' as any,
        message: 'Message',
      }),
    ).toThrow(/Invalid mission alert severity/);
  });

  it('removes objectives and conditions', () => {
    const designer = createDesigner();
    designer.removeObjective('obj-2');
    expect(designer.getDesign().objectives).toHaveLength(1);
  });

  it('rejects invalid time limit', () => {
    const designer = new MissionDesigner('m', 'Mission');
    expect(() => designer.setTimeLimit(0)).toThrow(/positive finite number/);
    expect(() => designer.setTimeLimit(-1)).toThrow(/positive finite number/);
  });

  it('rejects invalid scoring rules', () => {
    const designer = new MissionDesigner('m', 'Mission');
    expect(() =>
      designer.setScoringRules({
        accuracyWeight: -1,
        responseTimeWeight: 0.2,
        evidenceQualityWeight: 0.2,
        damagePenaltyWeight: 0.1,
      }),
    ).toThrow(/non-negative finite numbers/);
  });

  it('returns independent design copies', () => {
    const designer = createDesigner();
    const design1 = designer.build();
    design1.objectives[0].description = 'Mutated';
    expect(designer.getDesign().objectives[0].description).toBe('Identify compromised host');
  });

  it('validates required mission design fields before build', () => {
    const designer = new MissionDesigner('m', 'Mission');
    designer.addObjective({ id: 'obj', description: 'Objective', type: 'primary' });
    expect(() => designer.build()).toThrow(/at least one success condition/);
  });

  it('restores design from previous output', () => {
    const original = createDesigner().build();
    const restored = MissionDesigner.fromDesign(original);
    expect(restored.build()).toEqual(original);
  });
});
