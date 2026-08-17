import { describe, it, expect } from 'vitest';
import { createObjective, Mission, MissionStatus } from '../index.js';

describe('Objective creation', () => {
  it('creates an objective', () => {
    const obj = createObjective('o1', 'Find compromised host');
    expect(obj.id).toBe('o1');
    expect(obj.description).toBe('Find compromised host');
    expect(obj.isCompleted).toBe(false);
  });

  it('throws on empty id or description', () => {
    expect(() => createObjective('', 'desc')).toThrow(/non-empty/);
    expect(() => createObjective('id', '')).toThrow(/non-empty/);
  });
});

describe('Mission', () => {
  it('creates a mission with objectives', () => {
    const mission = new Mission('m1', {
      name: 'Test Mission',
      objectives: [createObjective('o1', 'Objective 1')],
    });
    expect(mission.id).toBe('m1');
    expect(mission.name).toBe('Test Mission');
    expect(mission.getObjectives()).toHaveLength(1);
    expect(mission.getStatus()).toBe(MissionStatus.Pending);
  });

  it('throws on empty name', () => {
    expect(() => new Mission('m1', { name: '', objectives: [createObjective('o1', 'Obj')] }))
      .toThrow(/non-empty/);
  });

  it('throws when no objectives provided', () => {
    expect(() => new Mission('m1', { name: 'Mission', objectives: [] }))
      .toThrow(/at least one objective/);
  });

  it('starts and completes objectives', () => {
    const mission = new Mission('m1', {
      name: 'Test',
      objectives: [
        createObjective('o1', 'First'),
        createObjective('o2', 'Second'),
      ],
    });
    mission.start(0);
    expect(mission.getStatus()).toBe(MissionStatus.Active);
    mission.completeObjective('o1', 10);
    expect(mission.getStatus()).toBe(MissionStatus.Active);
    mission.completeObjective('o2', 20);
    expect(mission.getStatus()).toBe(MissionStatus.Completed);
    expect(mission.isCompleted()).toBe(true);
  });

  it('throws when completing objective before start', () => {
    const mission = new Mission('m1', {
      name: 'Test',
      objectives: [createObjective('o1', 'Obj')],
    });
    expect(() => mission.completeObjective('o1')).toThrow(/not active/);
  });

  it('throws when completing unknown objective', () => {
    const mission = new Mission('m1', {
      name: 'Test',
      objectives: [createObjective('o1', 'Obj')],
    });
    mission.start(0);
    expect(() => mission.completeObjective('unknown')).toThrow(/not found/);
  });

  it('fails mission when time limit exceeded', () => {
    const mission = new Mission('m1', {
      name: 'Timed Mission',
      objectives: [createObjective('o1', 'Obj')],
      timeLimitMs: 100,
    });
    mission.start(0);
    const exceeded = mission.checkTimeLimit(101);
    expect(exceeded).toBe(true);
    expect(mission.getStatus()).toBe(MissionStatus.Failed);
  });

  it('does not fail before time limit', () => {
    const mission = new Mission('m1', {
      name: 'Timed Mission',
      objectives: [createObjective('o1', 'Obj')],
      timeLimitMs: 100,
    });
    mission.start(0);
    const exceeded = mission.checkTimeLimit(100);
    expect(exceeded).toBe(false);
    expect(mission.getStatus()).toBe(MissionStatus.Active);
  });

  it('can fail mission manually', () => {
    const mission = new Mission('m1', {
      name: 'Test',
      objectives: [createObjective('o1', 'Obj')],
    });
    mission.start(0);
    mission.failMission(50);
    expect(mission.isFailed()).toBe(true);
    expect(mission.getStatus()).toBe(MissionStatus.Failed);
  });

  it('throws when completing already completed objective', () => {
    const mission = new Mission('m1', {
      name: 'Test',
      objectives: [
        createObjective('o1', 'First'),
        createObjective('o2', 'Second'),
      ],
    });
    mission.start(0);
    mission.completeObjective('o1', 10); // mission still active (o2 incomplete)
    expect(() => mission.completeObjective('o1', 20)).toThrow(/already completed/);
  });

  it('throws when completing objective after mission completed', () => {
    const mission = new Mission('m1', {
      name: 'Test',
      objectives: [createObjective('o1', 'Obj')],
    });
    mission.start(0);
    mission.completeObjective('o1', 10);
    expect(mission.getStatus()).toBe(MissionStatus.Completed);
    expect(() => mission.completeObjective('o1', 20)).toThrow(/not active/);
  });

  it('serialises to JSON', () => {
    const mission = new Mission('m1', {
      name: 'Test',
      objectives: [createObjective('o1', 'Obj')],
    });
    mission.start(0);
    mission.completeObjective('o1', 10);
    const json = mission.toJSON();
    expect(json.id).toBe('m1');
    expect(json.status).toBe(MissionStatus.Completed);
    expect(Array.isArray(json.objectives)).toBe(true);
  });
});
