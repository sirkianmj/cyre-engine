import { UIRenderer, type RenderedUI } from './UIRenderer.js';
import type { UIComponent } from './UIComponent.js';

export class UIComponentRegistry {
  private readonly components = new Map<string, UIComponent>();
  private readonly renderer: UIRenderer;

  constructor(renderer: UIRenderer = new UIRenderer()) {
    if (!renderer || typeof renderer.render !== 'function') {
      throw new Error('UI component registry renderer must expose a render() method.');
    }
    this.renderer = renderer;
  }

  register(id: string, component: UIComponent): void {
    if (!id || id.trim() === '') {
      throw new Error('UI component id is required.');
    }
    if (!component || typeof component.render !== 'function') {
      throw new Error('UI component must expose a render() method.');
    }
    if (this.components.has(id)) {
      throw new Error(`UI component "${id}" already exists.`);
    }
    this.components.set(id, component);
  }

  unregister(id: string): void {
    if (!this.components.has(id)) {
      throw new Error(`UI component "${id}" does not exist.`);
    }
    this.components.delete(id);
  }

  has(id: string): boolean {
    return this.components.has(id);
  }

  get(id: string): UIComponent {
    const component = this.components.get(id);
    if (!component) {
      throw new Error(`UI component "${id}" does not exist.`);
    }
    return component;
  }

  listIds(): string[] {
    return [...this.components.keys()].sort();
  }

  render(id: string): RenderedUI {
    return this.renderer.render(this.get(id));
  }

  renderAll(): RenderedUI[] {
    return this.listIds().map((id) => this.renderer.render(this.components.get(id)!));
  }
}
