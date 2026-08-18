import * as core from '../core/index.js';
import * as cyber from '../cyber/index.js';
import * as game from '../game/index.js';
import * as scenario from '../scenario/index.js';
import * as serialization from '../serialization/index.js';
import * as project from '../project/index.js';
import * as scene from '../scene/index.js';
import * as editor from '../editor/index.js';
import * as debug from '../debug/index.js';
import * as timeline from '../timeline/index.js';
import * as replay from '../replay/index.js';
import * as analytics from '../analytics/index.js';
import * as automation from '../automation/index.js';
import * as research from '../research/index.js';
import * as platform from '../platform/index.js';
import * as ui from '../ui/index.js';

export interface PublicApiModule {
  name: string;
  version: number;
  namespace: Record<string, unknown>;
}

export const PUBLIC_API_MODULES: PublicApiModule[] = [
  { name: 'core', version: 1, namespace: core },
  { name: 'cyber', version: 1, namespace: cyber },
  { name: 'game', version: 1, namespace: game },
  { name: 'scenario', version: 1, namespace: scenario },
  { name: 'serialization', version: 1, namespace: serialization },
  { name: 'project', version: 1, namespace: project },
  { name: 'scene', version: 1, namespace: scene },
  { name: 'editor', version: 1, namespace: editor },
  { name: 'debug', version: 1, namespace: debug },
  { name: 'timeline', version: 1, namespace: timeline },
  { name: 'replay', version: 1, namespace: replay },
  { name: 'analytics', version: 1, namespace: analytics },
  { name: 'automation', version: 1, namespace: automation },
  { name: 'research', version: 1, namespace: research },
  { name: 'platform', version: 1, namespace: platform },
  { name: 'ui', version: 1, namespace: ui },
];

export const CYRE_ENGINE_VERSION = '1.0.0';
export const CYRE_PUBLIC_API_VERSION = 1;

export class PublicApiRegistry {
  static getModuleNames(): string[] {
    return PUBLIC_API_MODULES.map((module) => module.name);
  }

  static getRuntimeSymbols(moduleName: string): string[] {
    const module = PUBLIC_API_MODULES.find((entry) => entry.name === moduleName);
    if (!module) {
      return [];
    }
    return Object.keys(module.namespace).sort();
  }

  static hasModule(moduleName: string): boolean {
    return PUBLIC_API_MODULES.some((module) => module.name === moduleName);
  }

  static getModuleVersion(moduleName: string): number | undefined {
    const module = PUBLIC_API_MODULES.find((entry) => entry.name === moduleName);
    return module?.version;
  }
}
