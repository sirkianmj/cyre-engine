/**
 * Hardware capability detection for the launcher.
 *
 * The renderer choice in the launcher is a real choice, so it is backed by an
 * actual probe of what the platform provides rather than a decorative dropdown.
 * Every probe is guarded: a headless or jsdom environment simply reports no
 * WebGL, which is the same answer a locked-down browser gives.
 */

import type { LauncherRenderer } from './projectStore';

export interface HardwareReport {
  webgl2: boolean;
  webgl1: boolean;
  /** GPU string from WEBGL_debug_renderer_info, when the driver allows it. */
  gpu: string;
  vendor: string;
  /** `navigator.deviceMemory`, which only some browsers expose. */
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  devicePixelRatio: number;
}

interface ProbeWindow {
  devicePixelRatio?: number;
  navigator?: {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
}

function probeContext(canvas: HTMLCanvasElement, kind: 'webgl2' | 'webgl'): WebGLRenderingContext | null {
  try {
    const context =
      kind === 'webgl2'
        ? canvas.getContext('webgl2')
        : (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'));
    return (context as WebGLRenderingContext | null) ?? null;
  } catch {
    return null;
  }
}

function readGpu(context: WebGLRenderingContext | null): { gpu: string; vendor: string } {
  if (!context) return { gpu: 'unknown', vendor: 'unknown' };

  try {
    // Requires WEBGL_debug_renderer_info; drivers are free to refuse, and many
    // do for fingerprinting reasons. Reporting 'unknown' is the honest result.
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    if (!debug) return { gpu: 'restricted', vendor: 'restricted' };

    const gpu = context.getParameter(debug.UNMASKED_RENDERER_WEBGL);
    const vendor = context.getParameter(debug.UNMASKED_VENDOR_WEBGL);

    return {
      gpu: typeof gpu === 'string' && gpu !== '' ? gpu : 'unknown',
      vendor: typeof vendor === 'string' && vendor !== '' ? vendor : 'unknown',
    };
  } catch {
    return { gpu: 'restricted', vendor: 'restricted' };
  }
}

export function detectHardware(target?: ProbeWindow): HardwareReport {
  const scope: ProbeWindow =
    target ?? (typeof window === 'undefined' ? {} : (window as unknown as ProbeWindow));

  let webgl2 = false;
  let webgl1 = false;
  let gpu = 'unknown';
  let vendor = 'unknown';

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');

    const context2 = probeContext(canvas, 'webgl2');
    webgl2 = context2 !== null;
    if (context2) {
      ({ gpu, vendor } = readGpu(context2));
    }

    if (!webgl2) {
      const context1 = probeContext(canvas, 'webgl');
      webgl1 = context1 !== null;
      if (context1) {
        ({ gpu, vendor } = readGpu(context1));
      }
    } else {
      webgl1 = true;
    }
  }

  const deviceMemoryGb =
    typeof scope.navigator?.deviceMemory === 'number' ? scope.navigator.deviceMemory : null;
  const hardwareConcurrency =
    typeof scope.navigator?.hardwareConcurrency === 'number'
      ? scope.navigator.hardwareConcurrency
      : null;

  return {
    webgl2,
    webgl1,
    gpu,
    vendor,
    deviceMemoryGb,
    hardwareConcurrency,
    devicePixelRatio: typeof scope.devicePixelRatio === 'number' ? scope.devicePixelRatio : 1,
  };
}

/**
 * Suggests a renderer from the probe.
 *
 * The engine GPU path needs WebGL2; without it the Studio falls back to a
 * Canvas2D surface, so the launcher should say so up front instead of letting
 * the user pick something that will not run.
 */
export function recommendedRenderer(report: HardwareReport): LauncherRenderer {
  return report.webgl2 ? 'engine-gpu' : 'three-webgl';
}

/** A one-line summary for the launcher's hardware panel. */
export function describeHardware(report: HardwareReport): string {
  const parts: string[] = [];

  parts.push(report.webgl2 ? 'WebGL2' : report.webgl1 ? 'WebGL1 only' : 'no WebGL');
  if (report.gpu !== 'unknown' && report.gpu !== 'restricted') parts.push(report.gpu);
  if (report.hardwareConcurrency !== null) parts.push(`${report.hardwareConcurrency} threads`);
  if (report.deviceMemoryGb !== null) parts.push(`${report.deviceMemoryGb} GB`);

  return parts.join(' · ');
}
