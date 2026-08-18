export type EventTriggerActionType =
  | 'generate-alert'
  | 'increase-threat-level'
  | 'notify-analyst'
  | 'update-evidence';

export interface EventTriggerCondition {
  eventType: string;
  sourceId?: string;
  targetId?: string;
  requiredFields?: Record<string, unknown>;
}

export interface EventTriggerAction {
  actionType: EventTriggerActionType;
  params?: Record<string, unknown>;
}

export interface EventTriggerRule {
  id: string;
  name: string;
  description?: string;
  condition: EventTriggerCondition;
  actions: EventTriggerAction[];
  enabled?: boolean;
}

export interface TriggerEvent {
  type: string;
  sourceId?: string;
  targetId?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface TriggerActionResult {
  ruleId: string;
  actionIndex: number;
  actionType: EventTriggerActionType;
  params: Record<string, unknown>;
}

export class EventTriggerSystem {
  private readonly rules = new Map<string, EventTriggerRule>();

  addRule(rule: EventTriggerRule): void {
    this.validateRule(rule);
    if (this.rules.has(rule.id)) {
      throw new Error(`Event trigger rule "${rule.id}" already exists.`);
    }
    this.rules.set(rule.id, this.copyRule(rule));
  }

  getRule(ruleId: string): EventTriggerRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Event trigger rule "${ruleId}" does not exist.`);
    }
    return this.copyRule(rule);
  }

  listRules(): EventTriggerRule[] {
    return [...this.rules.values()].map((rule) => this.copyRule(rule));
  }

  removeRule(ruleId: string): void {
    if (!this.rules.has(ruleId)) {
      throw new Error(`Event trigger rule "${ruleId}" does not exist.`);
    }
    this.rules.delete(ruleId);
  }

  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.requireRule(ruleId);
    this.rules.set(ruleId, { ...rule, enabled });
  }

  findRulesForEventType(eventType: string): EventTriggerRule[] {
    if (!eventType || eventType.trim() === '') {
      throw new Error('Event type is required.');
    }
    return this.listRules().filter(
      (rule) => rule.condition.eventType === eventType,
    );
  }

  search(query: string): EventTriggerRule[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return this.listRules();
    }

    return this.listRules().filter((rule) => {
      const searchableText = [
        rule.id,
        rule.name,
        rule.description ?? '',
        rule.condition.eventType,
        rule.condition.sourceId ?? '',
        rule.condition.targetId ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }

  evaluate(event: TriggerEvent): TriggerActionResult[] {
    this.validateEvent(event);
    const results: TriggerActionResult[] = [];

    for (const rule of this.rules.values()) {
      if (rule.enabled === false) {
        continue;
      }

      if (!this.matchesCondition(event, rule.condition)) {
        continue;
      }

      rule.actions.forEach((action, actionIndex) => {
        results.push({
          ruleId: rule.id,
          actionIndex,
          actionType: action.actionType,
          params: action.params ? JSON.parse(JSON.stringify(action.params)) : {},
        });
      });
    }

    return results;
  }

  private matchesCondition(
    event: TriggerEvent,
    condition: EventTriggerCondition,
  ): boolean {
    if (event.type !== condition.eventType) {
      return false;
    }

    if (condition.sourceId !== undefined && event.sourceId !== condition.sourceId) {
      return false;
    }

    if (condition.targetId !== undefined && event.targetId !== condition.targetId) {
      return false;
    }

    if (condition.requiredFields) {
      return this.matchesRequiredFields(event.data ?? {}, condition.requiredFields);
    }

    return true;
  }

  private matchesRequiredFields(
    eventData: Record<string, unknown>,
    requiredFields: Record<string, unknown>,
  ): boolean {
    for (const [key, expectedValue] of Object.entries(requiredFields)) {
      if (JSON.stringify(eventData[key]) !== JSON.stringify(expectedValue)) {
        return false;
      }
    }
    return true;
  }

  private requireRule(ruleId: string): EventTriggerRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Event trigger rule "${ruleId}" does not exist.`);
    }
    return rule;
  }

  private validateRule(rule: EventTriggerRule): void {
    if (!rule.id || rule.id.trim() === '') {
      throw new Error('Event trigger rule id is required.');
    }
    if (!rule.name || rule.name.trim() === '') {
      throw new Error('Event trigger rule name is required.');
    }

    this.validateCondition(rule.condition);

    if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
      throw new Error('Event trigger rule actions must be a non-empty array.');
    }

    for (const action of rule.actions) {
      this.validateAction(action);
    }
  }

  private validateCondition(condition: EventTriggerCondition): void {
    if (!condition || typeof condition !== 'object') {
      throw new Error('Event trigger condition is required.');
    }

    if (!condition.eventType || condition.eventType.trim() === '') {
      throw new Error('Event trigger condition eventType is required.');
    }
  }

  private validateAction(action: EventTriggerAction): void {
    if (!action || typeof action !== 'object') {
      throw new Error('Event trigger action is required.');
    }

    if (
      !['generate-alert', 'increase-threat-level', 'notify-analyst', 'update-evidence'].includes(
        action.actionType,
      )
    ) {
      throw new Error(`Invalid event trigger action type "${action.actionType}".`);
    }
  }

  private validateEvent(event: TriggerEvent): void {
    if (!event || typeof event !== 'object') {
      throw new Error('Trigger event is required.');
    }

    if (!event.type || event.type.trim() === '') {
      throw new Error('Trigger event type is required.');
    }

    if (event.timestamp !== undefined && (!Number.isFinite(event.timestamp) || event.timestamp < 0)) {
      throw new Error('Trigger event timestamp must be a non-negative finite number.');
    }
  }

  private copyRule(rule: EventTriggerRule): EventTriggerRule {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      condition: {
        eventType: rule.condition.eventType,
        sourceId: rule.condition.sourceId,
        targetId: rule.condition.targetId,
        requiredFields: rule.condition.requiredFields
          ? JSON.parse(JSON.stringify(rule.condition.requiredFields))
          : undefined,
      },
      actions: rule.actions.map((action) => ({
        actionType: action.actionType,
        params: action.params ? JSON.parse(JSON.stringify(action.params)) : undefined,
      })),
      enabled: rule.enabled,
    };
  }
}
