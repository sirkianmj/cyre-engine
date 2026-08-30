import { describe, it, expect } from 'vitest';
import { LiveSimulationInspector } from '../LiveSimulationInspector.js';
import { MissionFactory } from '../MissionFactory.js';
import { MissionRunner } from '../MissionRunner.js';
import { MissionStatus } from '../MissionStatus.js';

describe('LiveSimulationInspector', () => {
  it('captures a runtime snapshot for a loaded mission', () => {
    const scenario = MissionFactory.create('mission-001');
    const runner = new MissionRunner(scenario);
    runner.start();

    const snapshot = new LiveSimulationInspector().capture(runner);

    expect(snapshot.missionId).toBe('mission-001');
    expect(snapshot.missionName).toBe('The Compromised Employee');
    expect(snapshot.evidenceCount).toBeGreaterThan(0);
    expect(snapshot.alertCount).toBe(1);
    expect(snapshot.objectives.length).toBeGreaterThan(0);
    expect(snapshot.scenarioEvidence.length).toBeGreaterThan(0);
  });

  it('reflects mission completion in the snapshot', () => {
    const scenario = MissionFactory.create('mission-001');
    const runner = new MissionRunner(scenario);
    runner.start();
    runner.completeMission();

    const snapshot = new LiveSimulationInspector().capture(runner);
    expect(snapshot.missionStatus).toBe(String(MissionStatus.Completed));
    expect(snapshot.investigationPhase).toBe('complete');
  });

  it('throws when no runner is provided', () => {
    expect(() => new LiveSimulationInspector().capture(undefined as any)).toThrow(
      /Mission runner is required/,
    );
  });

  it('returns independent evidence and hypothesis arrays', () => {
    const scenario = MissionFactory.create('mission-001');
    const runner = new MissionRunner(scenario);
    runner.start();

    const inspector = new LiveSimulationInspector();
    const first = inspector.capture(runner);
    first.evidenceIds.push('mutated-evidence');
    first.hypotheses.push({ mutated: true });

    const second = inspector.capture(runner);
    expect(second.evidenceIds).not.toContain('mutated-evidence');
    expect(second.hypotheses).toEqual([]);
  });
});
