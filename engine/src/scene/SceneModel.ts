import type {
  SceneComponent,
  SceneComponentType,
  SceneData,
  SceneEnvironmentData,
  SceneHostData,
  SceneMissionStateData,
  SceneNetworkData,
  SceneOrganizationData,
  SceneSecurityControlData,
  SceneServiceData,
  SceneUserData,
} from './SceneTypes.js';

export class SceneModel {
  private readonly data: SceneData;

  constructor(data: SceneData) {
    this.validate(data);
    this.data = {
      id: data.id,
      name: data.name,
      components: data.components.map((component) => this.copyComponent(component)),
    };
  }

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getComponents(): SceneComponent[] {
    return this.data.components.map((component) => this.copyComponent(component));
  }

  getComponentsByType(type: SceneComponentType): SceneComponent[] {
    return this.getComponents().filter((component) => component.type === type);
  }

  getComponent(componentId: string): SceneComponent {
    const component = this.data.components.find((entry) => entry.id === componentId);
    if (!component) {
      throw new Error(`Scene component "${componentId}" does not exist.`);
    }
    return this.copyComponent(component);
  }

  addComponent(component: SceneComponent): void {
    this.validateComponent(component);
    if (this.data.components.some((entry) => entry.id === component.id)) {
      throw new Error(`Scene component "${component.id}" already exists.`);
    }
    this.data.components.push(this.copyComponent(component));
  }

  replaceComponents(components: SceneComponent[]): void {
    if (!Array.isArray(components)) {
      throw new Error('Scene components must be an array.');
    }
    const seenIds = new Set<string>();
    for (const component of components) {
      this.validateComponent(component);
      if (seenIds.has(component.id)) {
        throw new Error(`Duplicate scene component id "${component.id}".`);
      }
      seenIds.add(component.id);
    }
    this.data.components.length = 0;
    for (const component of components) {
      this.data.components.push(this.copyComponent(component));
    }
  }

  removeComponent(componentId: string): void {
    const index = this.data.components.findIndex((entry) => entry.id === componentId);
    if (index < 0) {
      throw new Error(`Scene component "${componentId}" does not exist.`);
    }
    this.data.components.splice(index, 1);
  }

  addOrganization(organization: SceneOrganizationData): void {
    this.addComponent({
      id: organization.id,
      type: 'organization',
      name: organization.name,
      data: {
        industry: organization.industry,
        description: organization.description,
      },
    });
  }

  addNetwork(network: SceneNetworkData): void {
    this.validateNetwork(network);
    this.addComponent({
      id: network.id,
      type: 'network',
      name: network.name,
      data: {
        nodes: [...network.nodes],
        edges: network.edges.map((edge) => ({ ...edge })),
      },
    });
  }

  addHost(host: SceneHostData): void {
    this.addComponent({
      id: host.id,
      type: 'host',
      name: host.displayName ?? host.hostId,
      data: {
        hostId: host.hostId,
        displayName: host.displayName,
        position: host.position ? { ...host.position } : undefined,
      },
    });
  }

  addUser(user: SceneUserData): void {
    this.addComponent({
      id: user.id,
      type: 'user',
      name: user.userId,
      data: {
        userId: user.userId,
      },
    });
  }

  addService(service: SceneServiceData): void {
    this.addComponent({
      id: service.id,
      type: 'service',
      name: service.serviceId,
      data: {
        serviceId: service.serviceId,
      },
    });
  }

  addSecurityControl(control: SceneSecurityControlData): void {
    this.addComponent({
      id: control.id,
      type: 'security-control',
      name: control.controlId,
      data: {
        controlId: control.controlId,
        enabled: control.enabled,
      },
    });
  }

  addEnvironment(environment: SceneEnvironmentData): void {
    this.validateEnvironment(environment);
    this.addComponent({
      id: environment.id,
      type: 'environment',
      name: environment.type,
      data: {
        type: environment.type,
        settings: { ...environment.settings },
      },
    });
  }

  addMissionState(missionState: SceneMissionStateData): void {
    this.validateMissionState(missionState);
    this.addComponent({
      id: missionState.id,
      type: 'mission-state',
      name: missionState.missionId ?? missionState.id,
      data: {
        missionId: missionState.missionId,
        status: missionState.status,
        objectives: [...missionState.objectives],
      },
    });
  }

  toJSON(): SceneData {
    return {
      id: this.data.id,
      name: this.data.name,
      components: this.data.components.map((component) => this.copyComponent(component)),
    };
  }

  private validate(data: SceneData): void {
    if (!data.id || data.id.trim() === '') {
      throw new Error('Scene id is required.');
    }
    if (!data.name || data.name.trim() === '') {
      throw new Error('Scene name is required.');
    }
    if (!Array.isArray(data.components)) {
      throw new Error('Scene components must be an array.');
    }
    const seenIds = new Set<string>();
    for (const component of data.components) {
      this.validateComponent(component);
      if (seenIds.has(component.id)) {
        throw new Error(`Duplicate scene component id "${component.id}".`);
      }
      seenIds.add(component.id);
    }
  }

  private validateComponent(component: SceneComponent): void {
    if (!component.id || component.id.trim() === '') {
      throw new Error('Scene component id is required.');
    }
    if (!component.name || component.name.trim() === '') {
      throw new Error('Scene component name is required.');
    }
    if (!['organization', 'network', 'host', 'user', 'service', 'security-control', 'environment', 'mission-state'].includes(component.type)) {
      throw new Error(`Invalid scene component type "${component.type}".`);
    }
  }

  private validateNetwork(network: SceneNetworkData): void {
    if (!network.id || network.id.trim() === '') {
      throw new Error('Network id is required.');
    }
    if (!network.name || network.name.trim() === '') {
      throw new Error('Network name is required.');
    }
    if (!Array.isArray(network.nodes)) {
      throw new Error('Network nodes must be an array.');
    }
    if (!Array.isArray(network.edges)) {
      throw new Error('Network edges must be an array.');
    }
    for (const edge of network.edges) {
      if (!edge.source || !edge.target) {
        throw new Error('Network edge source and target are required.');
      }
    }
  }

  private validateEnvironment(environment: SceneEnvironmentData): void {
    if (!environment.id || environment.id.trim() === '') {
      throw new Error('Environment id is required.');
    }
    if (!['2d', '2.5d', '3d'].includes(environment.type)) {
      throw new Error(`Invalid environment type "${environment.type}".`);
    }
  }

  private validateMissionState(missionState: SceneMissionStateData): void {
    if (!missionState.id || missionState.id.trim() === '') {
      throw new Error('Mission state id is required.');
    }
    if (!['pending', 'active', 'completed', 'failed'].includes(missionState.status)) {
      throw new Error(`Invalid mission state status "${missionState.status}".`);
    }
    if (!Array.isArray(missionState.objectives)) {
      throw new Error('Mission state objectives must be an array.');
    }
  }

  private copyComponent(component: SceneComponent): SceneComponent {
    return {
      id: component.id,
      type: component.type,
      name: component.name,
      data: component.data ? JSON.parse(JSON.stringify(component.data)) : undefined,
    };
  }
}
