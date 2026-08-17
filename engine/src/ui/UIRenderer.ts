/**
 * UIRenderer
 * -----------
 * Abstraction for rendering UI components.
 * The default renderer returns JSON representations.
 * Future renderers could target Canvas, WebGL, React, etc.
 */

import { UIComponent } from './UIComponent.js';

export interface RenderedUI {
  componentType: string;
  data: Record<string, unknown>;
}

export class UIRenderer {
  /**
   * Render a UI component to a plain object.
   */
  render(component: UIComponent): RenderedUI {
    const rendered = component.render();
    return {
      componentType: rendered.type as string,
      data: rendered,
    };
  }

  /**
   * Render multiple components.
   */
  renderAll(components: UIComponent[]): RenderedUI[] {
    return components.map((component) => this.render(component));
  }
}
