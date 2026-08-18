import { CyreSerializer } from './CyreSerializer.js';
import { SchemaRegistry } from './SchemaRegistry.js';
import { ScenarioDefinition } from '../scenario/index.js';

const SCENARIO_SCHEMA = 'cyre.scenario';
const SCENARIO_SCHEMA_VERSION = 1;

function validateScenarioData(data: unknown): string[] {
  if (!data || typeof data !== 'object') {
    return ['Scenario data must be an object.'];
  }

  const record = data as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof record.id !== 'string' || record.id.trim() === '') {
    errors.push('Scenario data id must be a non-empty string.');
  }
  if (typeof record.name !== 'string' || record.name.trim() === '') {
    errors.push('Scenario data name must be a non-empty string.');
  }
  if (!record.organization || typeof record.organization !== 'object') {
    errors.push('Scenario data organization must be an object.');
  }
  if (!record.network || typeof record.network !== 'object') {
    errors.push('Scenario data network must be an object.');
  }
  if (!Array.isArray(record.assets)) {
    errors.push('Scenario data assets must be an array.');
  }
  if (!Array.isArray(record.users)) {
    errors.push('Scenario data users must be an array.');
  }
  if (!record.attacker || typeof record.attacker !== 'object') {
    errors.push('Scenario data attacker must be an object.');
  }
  if (!record.attackPath || typeof record.attackPath !== 'object') {
    errors.push('Scenario data attackPath must be an object.');
  }
  if (!Array.isArray(record.evidence)) {
    errors.push('Scenario data evidence must be an array.');
  }
  if (!Array.isArray(record.objectives) || record.objectives.length === 0) {
    errors.push('Scenario data objectives must be a non-empty array.');
  }
  if (!Array.isArray(record.timeline)) {
    errors.push('Scenario data timeline must be an array.');
  }

  return errors;
}

export class ScenarioSerializer {
  private readonly serializer: CyreSerializer;

  constructor(registry: SchemaRegistry = new SchemaRegistry()) {
    registry.register({
      name: SCENARIO_SCHEMA,
      latestVersion: SCENARIO_SCHEMA_VERSION,
      validate: validateScenarioData,
    });
    this.serializer = new CyreSerializer(registry);
  }

  serialize(scenario: ScenarioDefinition): string {
    const data = scenario.getData();
    return this.serializer.serialize(SCENARIO_SCHEMA, data.id, data);
  }

  deserialize(json: string): ScenarioDefinition {
    const { data } = this.serializer.deserialize<Record<string, unknown>>(json);
    return new ScenarioDefinition(data as any);
  }
}
