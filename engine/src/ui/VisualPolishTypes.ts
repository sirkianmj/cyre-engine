export const VISUAL_INTENSITIES = [
  'minimal',
  'balanced',
  'high',
] as const;

export type VisualIntensity = (typeof VISUAL_INTENSITIES)[number];

export function isVisualIntensity(value: string): value is VisualIntensity {
  return (VISUAL_INTENSITIES as readonly string[]).includes(value);
}

export const VISUAL_MOTION_PRESETS = [
  'instant',
  'fast',
  'normal',
  'slow',
] as const;

export type VisualMotionPreset = (typeof VISUAL_MOTION_PRESETS)[number];

export function isVisualMotionPreset(
  value: string,
): value is VisualMotionPreset {
  return (VISUAL_MOTION_PRESETS as readonly string[]).includes(value);
}
