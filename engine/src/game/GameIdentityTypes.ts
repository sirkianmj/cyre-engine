export const GAME_TARGET_PLATFORMS = [
  'web',
  'mobile',
  'desktop',
  'console',
] as const;

export type GameTargetPlatform = (typeof GAME_TARGET_PLATFORMS)[number];

export function isGameTargetPlatform(
  value: string,
): value is GameTargetPlatform {
  return (GAME_TARGET_PLATFORMS as readonly string[]).includes(value);
}

export const ART_DIRECTION_STYLES = [
  'minimal-terminal',
  'tactical-2d',
  'isometric-25d',
  'immersive-3d',
  'hybrid',
] as const;

export type ArtDirectionStyle = (typeof ART_DIRECTION_STYLES)[number];

export function isArtDirectionStyle(value: string): value is ArtDirectionStyle {
  return (ART_DIRECTION_STYLES as readonly string[]).includes(value);
}

export const PLAYER_ROLES = [
  'soc-analyst',
  'incident-responder',
  'threat-hunter',
  'red-team-operator',
  'security-engineer',
  'multi-role',
] as const;

export type PlayerRole = (typeof PLAYER_ROLES)[number];

export function isPlayerRole(value: string): value is PlayerRole {
  return (PLAYER_ROLES as readonly string[]).includes(value);
}

export const NARRATIVE_TONES = [
  'realistic',
  'thriller',
  'educational',
  'cinematic',
  'corporate',
] as const;

export type NarrativeTone = (typeof NARRATIVE_TONES)[number];

export function isNarrativeTone(value: string): value is NarrativeTone {
  return (NARRATIVE_TONES as readonly string[]).includes(value);
}

export const PROGRESSION_STYLES = [
  'linear-campaign',
  'branching',
  'adaptive',
  'sandbox',
  'career',
] as const;

export type ProgressionStyle = (typeof PROGRESSION_STYLES)[number];

export function isProgressionStyle(value: string): value is ProgressionStyle {
  return (PROGRESSION_STYLES as readonly string[]).includes(value);
}

export const GAME_PILLAR_CATEGORIES = [
  'cyber-investigation',
  'defense',
  'attack',
  'education',
  'automation',
  'research',
] as const;

export type GamePillarCategory = (typeof GAME_PILLAR_CATEGORIES)[number];

export function isGamePillarCategory(
  value: string,
): value is GamePillarCategory {
  return (GAME_PILLAR_CATEGORIES as readonly string[]).includes(value);
}

export const ACCESSIBILITY_TARGETS = [
  'keyboard',
  'screen-reader',
  'high-contrast',
  'color-blind-safe',
  'scalable-text',
  'reduced-motion',
  'controller',
] as const;

export type AccessibilityTarget = (typeof ACCESSIBILITY_TARGETS)[number];

export function isAccessibilityTarget(
  value: string,
): value is AccessibilityTarget {
  return (ACCESSIBILITY_TARGETS as readonly string[]).includes(value);
}

export interface GamePillar {
  id: string;
  name: string;
  description: string;
  category: GamePillarCategory;
  weight: number;
}

export interface GameIdentityDefinition {
  id: string;
  title: string;
  codename: string;
  description: string;
  playerFantasy: string;
  playerRoles: PlayerRole[];
  artDirection: ArtDirectionStyle;
  narrativeTone: NarrativeTone;
  progressionStyle: ProgressionStyle;
  pillars: GamePillar[];
  targetPlatforms: GameTargetPlatform[];
  uiIdentity?: string;
  accessibilityTargets?: AccessibilityTarget[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}
