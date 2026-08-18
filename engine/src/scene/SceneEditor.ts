import { SceneModel } from './SceneModel.js';
import type { SceneData, SceneComponent } from './SceneTypes.js';

export class SceneEditor {
  private readonly scene: SceneModel;
  private selectedComponentId?: string;
  private readonly undoStack: SceneData[] = [];
  private readonly redoStack: SceneData[] = [];

  constructor(sceneId: string, sceneName: string) {
    this.scene = new SceneModel({ id: sceneId, name: sceneName, components: [] });
  }

  static fromScene(scene: SceneModel): SceneEditor {
    const editor = new SceneEditor(scene.getId(), scene.getName());
    editor.scene.replaceComponents(scene.getComponents());
    return editor;
  }

  getScene(): SceneModel {
    return this.scene;
  }

  getSceneData(): SceneData {
    return this.scene.toJSON();
  }

  selectComponent(componentId: string): void {
    this.scene.getComponent(componentId);
    this.selectedComponentId = componentId;
  }

  clearSelection(): void {
    this.selectedComponentId = undefined;
  }

  getSelectedComponentId(): string | undefined {
    return this.selectedComponentId;
  }

  addOrganization(id: string, name: string, industry?: string, description?: string): this {
    this.captureSnapshot();
    this.scene.addOrganization({ id, name, industry, description });
    this.selectedComponentId = id;
    return this;
  }

  addNetwork(id: string, name: string, nodes: string[] = [], edges: Array<{ source: string; target: string }> = []): this {
    this.captureSnapshot();
    this.scene.addNetwork({ id, name, nodes, edges });
    this.selectedComponentId = id;
    return this;
  }

  addHost(id: string, hostId: string, displayName?: string, position?: { x: number; y: number; z?: number }): this {
    this.captureSnapshot();
    this.scene.addHost({ id, hostId, displayName, position });
    this.selectedComponentId = id;
    return this;
  }

  addUser(id: string, userId: string): this {
    this.captureSnapshot();
    this.scene.addUser({ id, userId });
    this.selectedComponentId = id;
    return this;
  }

  addService(id: string, serviceId: string): this {
    this.captureSnapshot();
    this.scene.addService({ id, serviceId });
    this.selectedComponentId = id;
    return this;
  }

  addSecurityControl(id: string, controlId: string, enabled = true): this {
    this.captureSnapshot();
    this.scene.addSecurityControl({ id, controlId, enabled });
    this.selectedComponentId = id;
    return this;
  }

  addEnvironment(id: string, type: '2d' | '2.5d' | '3d', settings: Record<string, unknown> = {}): this {
    this.captureSnapshot();
    this.scene.addEnvironment({ id, type, settings });
    this.selectedComponentId = id;
    return this;
  }

  addMissionState(id: string, missionId: string | undefined, status: 'pending' | 'active' | 'completed' | 'failed', objectives: string[] = []): this {
    this.captureSnapshot();
    this.scene.addMissionState({ id, missionId, status, objectives });
    this.selectedComponentId = id;
    return this;
  }

  removeComponent(componentId: string): this {
    this.captureSnapshot();
    this.scene.removeComponent(componentId);
    if (this.selectedComponentId === componentId) {
      this.selectedComponentId = undefined;
    }
    return this;
  }

  connectNodes(networkId: string, source: string, target: string): this {
    this.captureSnapshot();

    const components = this.scene.getComponents();
    const index = components.findIndex((component) => component.id === networkId);

    if (index < 0) {
      throw new Error(`Scene component "${networkId}" does not exist.`);
    }

    const component = components[index];
    if (component.type !== 'network') {
      throw new Error(`Scene component "${networkId}" is not a network.`);
    }

    const data = component.data as { nodes: string[]; edges: Array<{ source: string; target: string }> };
    if (!data.nodes.includes(source)) {
      throw new Error(`Network node "${source}" does not exist.`);
    }
    if (!data.nodes.includes(target)) {
      throw new Error(`Network node "${target}" does not exist.`);
    }
    if (data.edges.some((edge) => edge.source === source && edge.target === target)) {
      throw new Error(`Network edge "${source}" to "${target}" already exists.`);
    }

    data.edges.push({ source, target });
    components[index] = {
      ...component,
      data: {
        ...data,
      },
    };

    this.scene.replaceComponents(components);
    this.selectedComponentId = networkId;
    return this;
  }

  undo(): boolean {
    const previous = this.undoStack.pop();
    if (!previous) {
      return false;
    }

    this.redoStack.push(this.scene.toJSON());
    this.restoreSnapshot(previous);
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) {
      return false;
    }

    this.undoStack.push(this.scene.toJSON());
    this.restoreSnapshot(next);
    return true;
  }

  private captureSnapshot(): void {
    this.undoStack.push(this.scene.toJSON());
    this.redoStack.length = 0;
  }

  private restoreSnapshot(snapshot: SceneData): void {
    this.scene.replaceComponents(snapshot.components);
    if (this.selectedComponentId && !snapshot.components.some((component) => component.id === this.selectedComponentId)) {
      this.selectedComponentId = undefined;
    }
  }
}
