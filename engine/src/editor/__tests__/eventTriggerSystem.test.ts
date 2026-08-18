import { describe, it, expect } from 'vitest';
import { EventTriggerSystem } from '../EventTriggerSystem.js';

function createSystem(): EventTriggerSystem {
  const system = new EventTriggerSystem();
  system.addRule({
    id: 'rule-suspicious-login',
    name: 'Suspicious privileged login',
    description: 'Generates an alert when a privileged account logs in suspiciously.',
    condition: {
      eventType: 'authentication_event',
      requiredFields: { privileged: true },
    },
    actions: [
      { actionType: 'generate-alert', params: { severity: 'high' } },
      { actionType: 'increase-threat-level', params: { amount: 2 } },
    ],
  });
  system.addRule({
    id: 'rule-lateral-movement',
    name: 'Lateral movement detected',
    condition: {
      eventType: 'network_connection',
      sourceId: 'workstation-1',
    },
    actions: [{ actionType: 'notify-analyst' }],
  });
  return system;
}

describe('EventTriggerSystem', () => {
  it('adds and lists trigger rules', () => {
    const system = createSystem();
    expect(system.listRules()).toHaveLength(2);
  });

  it('rejects duplicate rules', () => {
    const system = createSystem();
    expect(() =>
      system.addRule({
        id: 'rule-suspicious-login',
        name: 'Duplicate',
        condition: { eventType: 'event' },
        actions: [{ actionType: 'notify-analyst' }],
      }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid rule id and name', () => {
    const system = new EventTriggerSystem();
    expect(() =>
      system.addRule({
        id: '',
        name: 'Bad',
        condition: { eventType: 'event' },
        actions: [{ actionType: 'notify-analyst' }],
      }),
    ).toThrow(/id is required/);

    expect(() =>
      system.addRule({
        id: 'bad-name',
        name: '   ',
        condition: { eventType: 'event' },
        actions: [{ actionType: 'notify-analyst' }],
      }),
    ).toThrow(/name is required/);
  });

  it('rejects invalid condition event type', () => {
    const system = new EventTriggerSystem();
    expect(() =>
      system.addRule({
        id: 'bad-condition',
        name: 'Bad Condition',
        condition: { eventType: '' },
        actions: [{ actionType: 'notify-analyst' }],
      }),
    ).toThrow(/eventType is required/);
  });

  it('rejects invalid action type', () => {
    const system = new EventTriggerSystem();
    expect(() =>
      system.addRule({
        id: 'bad-action',
        name: 'Bad Action',
        condition: { eventType: 'event' },
        actions: [{ actionType: 'invalid' as any }],
      }),
    ).toThrow(/Invalid event trigger action type/);
  });

  it('rejects empty actions array', () => {
    const system = new EventTriggerSystem();
    expect(() =>
      system.addRule({
        id: 'no-actions',
        name: 'No Actions',
        condition: { eventType: 'event' },
        actions: [],
      }),
    ).toThrow(/non-empty array/);
  });

  it('evaluates matching events and returns actions', () => {
    const system = createSystem();
    const results = system.evaluate({
      type: 'authentication_event',
      data: { privileged: true },
    });
    expect(results).toHaveLength(2);
    expect(results[0].ruleId).toBe('rule-suspicious-login');
    expect(results[0].actionType).toBe('generate-alert');
    expect(results[1].actionType).toBe('increase-threat-level');
  });

  it('does not execute disabled rules', () => {
    const system = createSystem();
    system.setRuleEnabled('rule-suspicious-login', false);
    const results = system.evaluate({
      type: 'authentication_event',
      data: { privileged: true },
    });
    expect(results).toHaveLength(0);
  });

  it('matches source and target ids when provided', () => {
    const system = createSystem();
    expect(
      system.evaluate({
        type: 'network_connection',
        sourceId: 'workstation-1',
      }),
    ).toHaveLength(1);

    expect(
      system.evaluate({
        type: 'network_connection',
        sourceId: 'workstation-2',
      }),
    ).toHaveLength(0);
  });

  it('matches required fields deeply', () => {
    const system = createSystem();
    expect(
      system.evaluate({
        type: 'authentication_event',
        data: { privileged: false },
      }),
    ).toHaveLength(0);
  });

  it('rejects invalid event type', () => {
    const system = createSystem();
    expect(() => system.evaluate({ type: '' })).toThrow(/type is required/);
  });

  it('rejects invalid event timestamp', () => {
    const system = createSystem();
    expect(() => system.evaluate({ type: 'event', timestamp: -1 })).toThrow(/non-negative finite number/);
  });

  it('finds rules by event type', () => {
    const system = createSystem();
    expect(system.findRulesForEventType('authentication_event').map((rule) => rule.id)).toEqual([
      'rule-suspicious-login',
    ]);
  });

  it('searches rules by id, name, description, and condition', () => {
    const system = createSystem();
    expect(system.search('lateral').map((rule) => rule.id)).toEqual(['rule-lateral-movement']);
    expect(system.search('privileged').map((rule) => rule.id)).toEqual(['rule-suspicious-login']);
    expect(system.search('').length).toBe(2);
  });

  it('returns rules as deep copies', () => {
    const system = createSystem();
    const rules = system.listRules();
    rules[0].name = 'Mutated';
    expect(system.getRule('rule-suspicious-login').name).toBe('Suspicious privileged login');

    const rule = system.getRule('rule-suspicious-login');
    rule.condition.requiredFields = { changed: true };
    expect(system.getRule('rule-suspicious-login').condition.requiredFields).toEqual({
      privileged: true,
    });
  });
});
