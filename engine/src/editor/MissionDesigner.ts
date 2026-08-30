export type MissionDesignerObjectiveType = 'primary' | 'secondary';

export interface MissionDesignerObjective {
  id: string;
  description: string;
  type: MissionDesignerObjectiveType;
  optional?: boolean;
}

export interface MissionDesignerCondition {
  id: string;
  description: string;
  predicate?: string;
}

export interface MissionDesignerTrigger {
  id: string;
  description: string;
  eventType: string;
  conditionId?: string;
}

export interface MissionDesignerAlert {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp?: number;
}

export interface MissionDesignerEvidence {
  id: string;
  type: string;
  title: string;
  description: string;
  sourceId?: string;
  timestamp?: number;
}

export interface MissionDesignerScoringRules {
  accuracyWeight: number;
  responseTimeWeight: number;
  evidenceQualityWeight: number;
  damagePenaltyWeight: number;
}

export interface MissionDesignerDesign {
  id: string;
  name: string;
  objectives: MissionDesignerObjective[];
  successConditions: MissionDesignerCondition[];
  failureConditions: MissionDesignerCondition[];
  triggers: MissionDesignerTrigger[];
  alerts: MissionDesignerAlert[];
  evidence: MissionDesignerEvidence[];
  timeLimitMs?: number;
  scoringRules: MissionDesignerScoringRules;
}

const DEFAULT_SCORING_RULES: MissionDesignerScoringRules = {
  accuracyWeight: 0.4,
  responseTimeWeight: 0.2,
  evidenceQualityWeight: 0.3,
  damagePenaltyWeight: 0.1,
};

export class MissionDesigner {
  private readonly data: MissionDesignerDesign;

  constructor(id: string, name: string) {
    if (!id || id.trim() === '') {
      throw new Error('Mission design id is required.');
    }
    if (!name || name.trim() === '') {
      throw new Error('Mission design name is required.');
    }

    this.data = {
      id,
      name,
      objectives: [],
      successConditions: [],
      failureConditions: [],
      triggers: [],
      alerts: [],
      evidence: [],
      timeLimitMs: undefined,
      scoringRules: { ...DEFAULT_SCORING_RULES },
    };
  }

  static fromDesign(design: MissionDesignerDesign): MissionDesigner {
    const designer = new MissionDesigner(design.id, design.name);
    for (const objective of design.objectives) {
      designer.addObjective(objective);
    }
    for (const condition of design.successConditions) {
      designer.addSuccessCondition(condition);
    }
    for (const condition of design.failureConditions) {
      designer.addFailureCondition(condition);
    }
    for (const trigger of design.triggers) {
      designer.addTrigger(trigger);
    }
    for (const alert of design.alerts) {
      designer.addAlert(alert);
    }
    for (const evidence of design.evidence) {
      designer.addEvidence(evidence);
    }
    if (design.timeLimitMs !== undefined) {
      designer.setTimeLimit(design.timeLimitMs);
    }
    if (design.scoringRules) {
      designer.setScoringRules(design.scoringRules);
    }
    return designer;
  }

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  addObjective(objective: MissionDesignerObjective): this {
    this.validateObjective(objective);
    this.ensureUniqueId(this.data.objectives, objective.id, 'Mission objective');
    this.data.objectives.push({ ...objective });
    return this;
  }

  removeObjective(objectiveId: string): this {
    this.removeById(this.data.objectives, objectiveId, 'Mission objective');
    return this;
  }

  addSuccessCondition(condition: MissionDesignerCondition): this {
    this.validateCondition(condition);
    this.ensureUniqueId(this.data.successConditions, condition.id, 'Mission success condition');
    this.data.successConditions.push({ ...condition });
    return this;
  }

  addFailureCondition(condition: MissionDesignerCondition): this {
    this.validateCondition(condition);
    this.ensureUniqueId(this.data.failureConditions, condition.id, 'Mission failure condition');
    this.data.failureConditions.push({ ...condition });
    return this;
  }

  addTrigger(trigger: MissionDesignerTrigger): this {
    this.validateTrigger(trigger);
    this.ensureUniqueId(this.data.triggers, trigger.id, 'Mission trigger');
    if (trigger.conditionId) {
      this.ensureConditionExists(trigger.conditionId);
    }
    this.data.triggers.push({ ...trigger });
    return this;
  }

  addAlert(alert: MissionDesignerAlert): this {
    this.validateAlert(alert);
    this.ensureUniqueId(this.data.alerts, alert.id, 'Mission alert');
    this.data.alerts.push({ ...alert });
    return this;
  }

  addEvidence(evidence: MissionDesignerEvidence): this {
    this.validateEvidence(evidence);
    this.ensureUniqueId(this.data.evidence, evidence.id, 'Mission evidence');
    this.data.evidence.push({ ...evidence });
    return this;
  }

  setTimeLimit(timeLimitMs: number): this {
    if (!Number.isFinite(timeLimitMs) || timeLimitMs <= 0) {
      throw new Error('Mission design time limit must be a positive finite number.');
    }
    this.data.timeLimitMs = timeLimitMs;
    return this;
  }

  setScoringRules(rules: MissionDesignerScoringRules): this {
    this.validateScoringRules(rules);
    this.data.scoringRules = { ...rules };
    return this;
  }

  getDesign(): MissionDesignerDesign {
    return this.copyDesign(this.data);
  }

  build(): MissionDesignerDesign {
    this.validateDesign(this.data);
    return this.copyDesign(this.data);
  }

  private validateDesign(data: MissionDesignerDesign): void {
    if (!data.id || data.id.trim() === '') {
      throw new Error('Mission design id is required.');
    }
    if (!data.name || data.name.trim() === '') {
      throw new Error('Mission design name is required.');
    }
    if (!Array.isArray(data.objectives) || data.objectives.length === 0) {
      throw new Error('Mission design must have at least one objective.');
    }
    if (!Array.isArray(data.successConditions) || data.successConditions.length === 0) {
      throw new Error('Mission design must have at least one success condition.');
    }
    if (!Array.isArray(data.failureConditions)) {
      throw new Error('Mission design failure conditions must be an array.');
    }
    if (!Array.isArray(data.triggers)) {
      throw new Error('Mission design triggers must be an array.');
    }
    if (!Array.isArray(data.alerts)) {
      throw new Error('Mission design alerts must be an array.');
    }
    if (!Array.isArray(data.evidence)) {
      throw new Error('Mission design evidence must be an array.');
    }
    this.validateScoringRules(data.scoringRules);
  }

  private validateObjective(objective: MissionDesignerObjective): void {
    if (!objective.id || objective.id.trim() === '') {
      throw new Error('Mission objective id is required.');
    }
    if (!objective.description || objective.description.trim() === '') {
      throw new Error('Mission objective description is required.');
    }
    if (!['primary', 'secondary'].includes(objective.type)) {
      throw new Error(`Invalid mission objective type "${objective.type}".`);
    }
  }

  private validateCondition(condition: MissionDesignerCondition): void {
    if (!condition.id || condition.id.trim() === '') {
      throw new Error('Mission condition id is required.');
    }
    if (!condition.description || condition.description.trim() === '') {
      throw new Error('Mission condition description is required.');
    }
  }

  private validateTrigger(trigger: MissionDesignerTrigger): void {
    if (!trigger.id || trigger.id.trim() === '') {
      throw new Error('Mission trigger id is required.');
    }
    if (!trigger.description || trigger.description.trim() === '') {
      throw new Error('Mission trigger description is required.');
    }
    if (!trigger.eventType || trigger.eventType.trim() === '') {
      throw new Error('Mission trigger event type is required.');
    }
  }

  private validateAlert(alert: MissionDesignerAlert): void {
    if (!alert.id || alert.id.trim() === '') {
      throw new Error('Mission alert id is required.');
    }
    if (!alert.title || alert.title.trim() === '') {
      throw new Error('Mission alert title is required.');
    }
    if (!alert.message || alert.message.trim() === '') {
      throw new Error('Mission alert message is required.');
    }
    if (!['low', 'medium', 'high', 'critical'].includes(alert.severity)) {
      throw new Error(`Invalid mission alert severity "${alert.severity}".`);
    }
    if (alert.timestamp !== undefined && (!Number.isFinite(alert.timestamp) || alert.timestamp < 0)) {
      throw new Error('Mission alert timestamp must be a non-negative finite number.');
    }
  }

  private validateEvidence(evidence: MissionDesignerEvidence): void {
    if (!evidence.id || evidence.id.trim() === '') {
      throw new Error('Mission evidence id is required.');
    }
    if (!evidence.type || evidence.type.trim() === '') {
      throw new Error('Mission evidence type is required.');
    }
    if (!evidence.title || evidence.title.trim() === '') {
      throw new Error('Mission evidence title is required.');
    }
    if (!evidence.description || evidence.description.trim() === '') {
      throw new Error('Mission evidence description is required.');
    }
    if (evidence.timestamp !== undefined && (!Number.isFinite(evidence.timestamp) || evidence.timestamp < 0)) {
      throw new Error('Mission evidence timestamp must be a non-negative finite number.');
    }
  }

  private validateScoringRules(rules: MissionDesignerScoringRules): void {
    if (!rules || typeof rules !== 'object') {
      throw new Error('Mission scoring rules must be an object.');
    }
    const weights = [
      rules.accuracyWeight,
      rules.responseTimeWeight,
      rules.evidenceQualityWeight,
      rules.damagePenaltyWeight,
    ];
    for (const weight of weights) {
      if (!Number.isFinite(weight) || weight < 0) {
        throw new Error('Mission scoring weights must be non-negative finite numbers.');
      }
    }
  }

  private ensureConditionExists(conditionId: string): void {
    const exists =
      this.data.successConditions.some((condition) => condition.id === conditionId) ||
      this.data.failureConditions.some((condition) => condition.id === conditionId);
    if (!exists) {
      throw new Error(`Mission condition "${conditionId}" does not exist.`);
    }
  }

  private ensureUniqueId<T extends { id: string }>(items: T[], id: string, label: string): void {
    if (items.some((item) => item.id === id)) {
      throw new Error(`${label} "${id}" already exists.`);
    }
  }

  private removeById<T extends { id: string }>(items: T[], id: string, label: string): void {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new Error(`${label} "${id}" does not exist.`);
    }
    items.splice(index, 1);
  }

  private copyDesign(design: MissionDesignerDesign): MissionDesignerDesign {
    return {
      id: design.id,
      name: design.name,
      objectives: design.objectives.map((objective) => ({ ...objective })),
      successConditions: design.successConditions.map((condition) => ({ ...condition })),
      failureConditions: design.failureConditions.map((condition) => ({ ...condition })),
      triggers: design.triggers.map((trigger) => ({ ...trigger })),
      alerts: design.alerts.map((alert) => ({ ...alert })),
      evidence: design.evidence.map((evidence) => ({ ...evidence })),
      timeLimitMs: design.timeLimitMs,
      scoringRules: { ...design.scoringRules },
    };
  }
}
