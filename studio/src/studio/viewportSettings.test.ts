import { describe, expect, it } from 'vitest';

import { DEFAULT_GPU_RENDER_OPTIONS } from '@cyre/engine';

import { DEFAULT_VIEWPORT_SETTINGS } from './StudioContext';

/**
 * The Visualization window's defaults and the engine renderer's defaults must
 * agree. If they drift, the first frame renders with overlays the user never
 * chose — for example every host as a hollow ring.
 */
describe('viewport defaults agree with the engine renderer', () => {
  it('matches the engine default for every shared overlay', () => {
    const shared = [
      'showGrid',
      'showWireframe',
      'showLabels',
      'showCompromised',
      'showIsolated',
      'showAlerts',
      'showEvidence',
    ] as const;

    for (const key of shared) {
      expect(DEFAULT_VIEWPORT_SETTINGS[key], `${key} default drifted`).toBe(
        DEFAULT_GPU_RENDER_OPTIONS[key],
      );
    }
  });

  it('maps light intensity to unit brightness at the default value', () => {
    // CyreStage divides by 2.4, so the default intensity must yield 1.0.
    const brightness = DEFAULT_VIEWPORT_SETTINGS.lightIntensity / 2.4;
    expect(brightness).toBeCloseTo(DEFAULT_GPU_RENDER_OPTIONS.brightness, 6);
  });

  it('renders hosts as filled discs by default', () => {
    expect(DEFAULT_VIEWPORT_SETTINGS.showWireframe).toBe(false);
  });
});
