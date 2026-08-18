import { CyreSerializer } from './CyreSerializer.js';
import { SchemaRegistry } from './SchemaRegistry.js';

export interface CyreProjectData {
  id: string;
  name: string;
  description?: string;
  scenarioIds: string[];
  missionIds?: string[];
  engineVersion?: string;
  settings?: Record<string, unknown>;
}

const PROJECT_SCHEMA = 'cyre.project';
const PROJECT_SCHEMA_VERSION = 1;

function validateProjectData(data: unknown): string[] {
  if (!data || typeof data !== 'object') {
    return ['Project data must be an object.'];
  }

  const record = data as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof record.id !== 'string' || record.id.trim() === '') {
    errors.push('Project data id must be a non-empty string.');
  }
  if (typeof record.name !== 'string' || record.name.trim() === '') {
    errors.push('Project data name must be a non-empty string.');
  }
  if (!Array.isArray(record.scenarioIds)) {
    errors.push('Project data scenarioIds must be an array.');
  }

  return errors;
}

export class ProjectSerializer {
  private readonly serializer: CyreSerializer;

  constructor(registry: SchemaRegistry = new SchemaRegistry()) {
    registry.register({
      name: PROJECT_SCHEMA,
      latestVersion: PROJECT_SCHEMA_VERSION,
      validate: validateProjectData,
    });
    this.serializer = new CyreSerializer(registry);
  }

  serialize(project: CyreProjectData): string {
    return this.serializer.serialize(PROJECT_SCHEMA, project.id, project);
  }

  deserialize(json: string): CyreProjectData {
    const { data } = this.serializer.deserialize<CyreProjectData>(json);
    return data;
  }
}
