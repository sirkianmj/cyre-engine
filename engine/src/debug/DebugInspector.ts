/**
 * DebugInspector
 * ---------------
 * Inspects CYRE engine components and generates readable snapshots.
 * Useful for debugging, research, and replay.
 */

import type { DebugSnapshot } from './DebugSnapshot.js';

export class DebugInspector {
  /**
   * Create a snapshot from any object by calling toJSON if available,
   * or by returning the object itself.
   */
  inspectComponent(name: string, component: unknown): DebugSnapshot {
    const timestamp = Date.now();
    let data: unknown;
    if (component && typeof (component as { toJSON?: () => unknown }).toJSON === 'function') {
      data = (component as { toJSON: () => unknown }).toJSON();
    } else {
      data = component;
    }
    const summary = this.summarize(data);
    return {
      timestamp,
      sections: { [name]: data },
      summary: `${name}: ${summary}`,
    };
  }

  /**
   * Combine multiple component snapshots into one.
   */
  inspectAll(components: Record<string, unknown>): DebugSnapshot {
    const timestamp = Date.now();
    const sections: Record<string, unknown> = {};
    const summaries: string[] = [];
    for (const [name, component] of Object.entries(components)) {
      let data: unknown;
      if (component && typeof (component as { toJSON?: () => unknown }).toJSON === 'function') {
        data = (component as { toJSON: () => unknown }).toJSON();
      } else {
        data = component;
      }
      sections[name] = data;
      summaries.push(`${name}: ${this.summarize(data)}`);
    }
    return {
      timestamp,
      sections,
      summary: summaries.join(' | '),
    };
  }

  private summarize(data: unknown): string {
    if (data === null || data === undefined) return 'null';
    if (Array.isArray(data)) return `array(${data.length})`;
    if (typeof data === 'object') {
      const keys = Object.keys(data as Record<string, unknown>);
      return `object{${keys.slice(0, 5).join(',')}${keys.length > 5 ? '...' : ''}}`;
    }
    return typeof data;
  }
}
