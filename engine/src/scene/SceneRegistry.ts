import { SceneModel } from './SceneModel.js';
import type { SceneData } from './SceneTypes.js';

export interface SceneSummary {
  id: string;
  name: string;
  componentCount: number;
}

export class SceneRegistry {
  private readonly scenes = new Map<string, SceneModel>();

  registerScene(scene: SceneModel): void {
    const id = scene.getId();
    if (this.scenes.has(id)) {
      throw new Error(`Scene "${id}" already exists.`);
    }
    this.scenes.set(id, scene);
  }

  createScene(id: string, name: string): SceneModel {
    if (!id || id.trim() === '') {
      throw new Error('Scene id is required.');
    }
    if (!name || name.trim() === '') {
      throw new Error('Scene name is required.');
    }
    if (this.scenes.has(id)) {
      throw new Error(`Scene "${id}" already exists.`);
    }
    const scene = new SceneModel({ id, name, components: [] });
    this.scenes.set(id, scene);
    return scene;
  }

  getScene(sceneId: string): SceneModel {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene "${sceneId}" does not exist.`);
    }
    return scene;
  }

  hasScene(sceneId: string): boolean {
    return this.scenes.has(sceneId);
  }

  removeScene(sceneId: string): boolean {
    return this.scenes.delete(sceneId);
  }

  listScenes(): SceneSummary[] {
    return [...this.scenes.values()].map((scene) => ({
      id: scene.getId(),
      name: scene.getName(),
      componentCount: scene.getComponents().length,
    }));
  }

  importSceneData(data: SceneData): SceneModel {
    const scene = new SceneModel(data);
    this.registerScene(scene);
    return scene;
  }
}
