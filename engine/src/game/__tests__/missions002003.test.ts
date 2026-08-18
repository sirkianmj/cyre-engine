import { describe, it, expect } from 'vitest';
import {
  MissionFactory,
  MissionRunner,
  createMission002Scenario,
  createMission003Scenario,
} from '../index.js';
import { ScenarioValidator } from '../../scenario/index.js';

describe('Mission002 - Ransomware Outbreak', () => {
  it('creates a valid scenario', () => {
    const scenario = createMission002Scenario();
    expect(scenario.getId()).toBe('mission-002');
    const validator = new ScenarioValidator();
    const result = validator.validate(scenario.getData());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('is registered in MissionFactory', () => {
    expect(MissionFactory.has('mission-002')).toBe(true);
    const scenario = MissionFactory.create('mission-002');
    expect(scenario.getName()).toBe('Ransomware Outbreak');
  });

  it('MissionRunner can start and complete mission', () => {
    const scenario = createMission002Scenario();
    const runner = new MissionRunner(scenario);
    runner.start();
    expect(runner.getMissionStatus()).toBe('active');
    runner.acknowledgeAlert();
    runner.formHypothesis('Phishing attachment led to ransomware');
    runner.identifyAttackPath('internet', 'backup-server');
    runner.containIncident();
    runner.recoverIncident();
    runner.completeMission();
    expect(runner.getMissionStatus()).toBe('completed');
  });
});

describe('Mission003 - Insider Threat', () => {
  it('creates a valid scenario', () => {
    const scenario = createMission003Scenario();
    expect(scenario.getId()).toBe('mission-003');
    const validator = new ScenarioValidator();
    const result = validator.validate(scenario.getData());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('is registered in MissionFactory', () => {
    expect(MissionFactory.has('mission-003')).toBe(true);
    const scenario = MissionFactory.create('mission-003');
    expect(scenario.getName()).toBe('Insider Threat');
  });

  it('MissionRunner can start and complete mission', () => {
    const scenario = createMission003Scenario();
    const runner = new MissionRunner(scenario);
    runner.start();
    expect(runner.getMissionStatus()).toBe('active');
    runner.acknowledgeAlert();
    runner.formHypothesis('Compromised insider account');
    runner.identifyAttackPath('internal-user-pc', 'finance-server');
    runner.containIncident();
    runner.recoverIncident();
    runner.completeMission();
    expect(runner.getMissionStatus()).toBe('completed');
  });
});

describe('MissionFactory', () => {
  it('lists all missions', () => {
    const missions = MissionFactory.list();
    expect(missions).toContain('mission-001');
    expect(missions).toContain('mission-002');
    expect(missions).toContain('mission-003');
  });
});
