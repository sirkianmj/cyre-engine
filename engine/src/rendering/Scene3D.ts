import { Material3D } from './Material3D.js';
import { Mesh3D } from './Mesh3D.js';
import { Camera3D } from './Camera3D.js';
import { Light3D } from './Light3D.js';

export class Scene3D {
  private materials: Map<string, Material3D> = new Map();
  private meshes: Map<string, Mesh3D> = new Map();
  private cameras: Map<string, Camera3D> = new Map();
  private lights: Map<string, Light3D> = new Map();

  addMaterial(material: Material3D): void {
    if (this.materials.has(material.id)) {
      throw new Error(`Material3D "${material.id}" already exists.`);
    }
    this.materials.set(material.id, material.clone());
  }

  addMesh(mesh: Mesh3D): void {
    if (this.meshes.has(mesh.id)) {
      throw new Error(`Mesh3D "${mesh.id}" already exists.`);
    }
    if (!this.materials.has(mesh.materialId)) {
      throw new Error(`Mesh3D references unknown material "${mesh.materialId}".`);
    }
    this.meshes.set(mesh.id, mesh.clone());
  }

  addCamera(camera: Camera3D): void {
    if (this.cameras.has(camera.id)) {
      throw new Error(`Camera3D "${camera.id}" already exists.`);
    }
    this.cameras.set(camera.id, camera.clone());
  }

  addLight(light: Light3D): void {
    if (this.lights.has(light.id)) {
      throw new Error(`Light3D "${light.id}" already exists.`);
    }
    this.lights.set(light.id, light.clone());
  }

  getMaterial(id: string): Material3D | undefined {
    return this.materials.get(id)?.clone();
  }

  getMesh(id: string): Mesh3D | undefined {
    return this.meshes.get(id)?.clone();
  }

  getCamera(id: string): Camera3D | undefined {
    return this.cameras.get(id)?.clone();
  }

  getLight(id: string): Light3D | undefined {
    return this.lights.get(id)?.clone();
  }

  getMaterials(): Material3D[] {
    return Array.from(this.materials.values()).map((material) => material.clone());
  }

  getMeshes(): Mesh3D[] {
    return Array.from(this.meshes.values()).map((mesh) => mesh.clone());
  }

  getCameras(): Camera3D[] {
    return Array.from(this.cameras.values()).map((camera) => camera.clone());
  }

  getLights(): Light3D[] {
    return Array.from(this.lights.values()).map((light) => light.clone());
  }

  removeMaterial(id: string): void {
    if (!this.materials.delete(id)) {
      throw new Error(`Material3D "${id}" does not exist.`);
    }
  }

  removeMesh(id: string): void {
    if (!this.meshes.delete(id)) {
      throw new Error(`Mesh3D "${id}" does not exist.`);
    }
  }

  removeCamera(id: string): void {
    if (!this.cameras.delete(id)) {
      throw new Error(`Camera3D "${id}" does not exist.`);
    }
  }

  removeLight(id: string): void {
    if (!this.lights.delete(id)) {
      throw new Error(`Light3D "${id}" does not exist.`);
    }
  }

  validate(): void {
    for (const mesh of this.meshes.values()) {
      mesh.validate();
      if (!this.materials.has(mesh.materialId)) {
        throw new Error(`Mesh3D "${mesh.id}" references missing material "${mesh.materialId}".`);
      }
    }
  }

  clone(): Scene3D {
    return Scene3D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      materials: this.getMaterials().map((material) => material.toJSON()),
      meshes: this.getMeshes().map((mesh) => mesh.toJSON()),
      cameras: this.getCameras().map((camera) => camera.toJSON()),
      lights: this.getLights().map((light) => light.toJSON()),
    };
  }

  static fromJSON(data: Record<string, unknown>): Scene3D {
    const scene = new Scene3D();

    const materials = Array.isArray(data.materials)
      ? (data.materials as Record<string, unknown>[])
      : [];
    for (const material of materials) {
      scene.addMaterial(Material3D.fromJSON(material));
    }

    const meshes = Array.isArray(data.meshes)
      ? (data.meshes as Record<string, unknown>[])
      : [];
    for (const mesh of meshes) {
      scene.addMesh(Mesh3D.fromJSON(mesh));
    }

    const cameras = Array.isArray(data.cameras)
      ? (data.cameras as Record<string, unknown>[])
      : [];
    for (const camera of cameras) {
      scene.addCamera(Camera3D.fromJSON(camera));
    }

    const lights = Array.isArray(data.lights)
      ? (data.lights as Record<string, unknown>[])
      : [];
    for (const light of lights) {
      scene.addLight(Light3D.fromJSON(light));
    }

    scene.validate();
    return scene;
  }
}
