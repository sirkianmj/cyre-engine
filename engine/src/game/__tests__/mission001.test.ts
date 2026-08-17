import { describe, it, expect } from 'vitest';
import {
  MissionFactory,
  MissionRunner,
  createMission001Scenario,
} from '../index.js';
import { ScenarioValidator } from '../../scenario/ScenarioValidator.js';

describe('Mission001', () => {
  it('creates a valid scenario', () => {
    const scenario = createMission001Scenario();
    expect(scenario.getId()).toBe('mission-001');
    const validator = new ScenarioValidator();
    const result = validator.validate(scenario.getData());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('is registered in MissionFactory', () => {
    expect(MissionFactory.has('mission-001')).toBe(true);
    const scenario = MissionFactory.create('mission-001');
    expect(scenario.getName()).toBe('The Compromised Employee');
  });

  it('MissionRunner can start and complete the mission', () => {
    const scenario = createMission001Scenario();
    const runner = new MissionRunner(scenario);
    runner.start();
    expect(runner.getMissionStatus()).toBe('active');

    runner.acknowledgeAlert();
    runner.formHypothesis('Employee credentials were compromised via VPN');
    runner.identifyAttackPath('internet', 'database');
    runner.containIncident();
    runner.recoverIncident();
    runner.completeMission();

    expect(runner.getMissionStatus()).toBe('completed');
  });

  it('MissionRunner contains evidence and alerts', () => {
    const scenario = createMission001Scenario();
    const runner = new MissionRunner(scenario);
    expect(runner.evidenceCollection.getAll().length).toBeGreaterThan(0);
    expect(runner.investigation.getAlerts().length).toBe(1);
  });
});
