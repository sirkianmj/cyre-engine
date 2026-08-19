import { describe, it, expect } from 'vitest';
import {
  MissionFactory,
  MissionRunner,
  createMission004Scenario,
  createMission005Scenario,
} from '../index.js';
import { ScenarioValidator } from '../../scenario/index.js';

describe('Mission004 - Supply Chain Compromise', () => {
  it('creates a valid scenario', () => {
    const scenario = createMission004Scenario();
    expect(scenario.getId()).toBe('mission-004');

    const validator = new ScenarioValidator();
    const result = validator.validate(scenario.getData());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('is registered in MissionFactory', () => {
    expect(MissionFactory.has('mission-004')).toBe(true);
    const scenario = MissionFactory.create('mission-004');
    expect(scenario.getName()).toBe('Supply Chain Compromise');
  });

  it('MissionRunner can start and complete mission', () => {
    const scenario = createMission004Scenario();
    const runner = new MissionRunner(scenario);
    runner.start();
    expect(runner.getMissionStatus()).toBe('active');

    runner.acknowledgeAlert();
    runner.formHypothesis('Malicious update package was pushed to operational systems');
    runner.identifyAttackPath('internet', 'historian');
    runner.containIncident();
    runner.recoverIncident();
    runner.completeMission();

    expect(runner.getMissionStatus()).toBe('completed');
  });
});

describe('Mission005 - Cloud Data Leak', () => {
  it('creates a valid scenario', () => {
    const scenario = createMission005Scenario();
    expect(scenario.getId()).toBe('mission-005');

    const validator = new ScenarioValidator();
    const result = validator.validate(scenario.getData());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('is registered in MissionFactory', () => {
    expect(MissionFactory.has('mission-005')).toBe(true);
    const scenario = MissionFactory.create('mission-005');
    expect(scenario.getName()).toBe('Cloud Data Leak');
  });

  it('MissionRunner can start and complete mission', () => {
    const scenario = createMission005Scenario();
    const runner = new MissionRunner(scenario);
    runner.start();
    expect(runner.getMissionStatus()).toBe('active');

    runner.acknowledgeAlert();
    runner.formHypothesis('Public storage bucket allowed customer data exfiltration');
    runner.identifyAttackPath('internet', 'external-host');
    runner.containIncident();
    runner.recoverIncident();
    runner.completeMission();

    expect(runner.getMissionStatus()).toBe('completed');
  });
});

describe('MissionFactory', () => {
  it('lists missions 001 through 005', () => {
    const missions = MissionFactory.list();
    expect(missions).toContain('mission-001');
    expect(missions).toContain('mission-002');
    expect(missions).toContain('mission-003');
    expect(missions).toContain('mission-004');
    expect(missions).toContain('mission-005');
  });
});
