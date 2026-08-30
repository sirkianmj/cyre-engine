import { ScoreResult } from './ScoringTypes.js';

export interface PlayerStats {
  totalMissionsCompleted: number;
  totalScore: number;
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  achievements: string[];
  unlocks: string[];
}

export class PlayerProgression {
  private level: number;
  private xp: number;
  private achievements: Set<string>;
  private unlocks: Set<string>;
  private missionsCompleted: number;
  private totalScore: number;

  constructor(
    options: {
      initialLevel?: number;
      initialXP?: number;
      initialAchievements?: string[];
      initialUnlocks?: string[];
    } = {},
  ) {
    this.level = options.initialLevel ?? 1;
    this.xp = options.initialXP ?? 0;
    if (this.level < 1) {
      throw new Error('Level must be at least 1.');
    }
    if (this.xp < 0) {
      throw new Error('XP cannot be negative.');
    }
    this.achievements = new Set(options.initialAchievements ?? []);
    this.unlocks = new Set(options.initialUnlocks ?? []);
    this.missionsCompleted = 0;
    this.totalScore = 0;
  }

  getLevel(): number {
    return this.level;
  }

  getXP(): number {
    return this.xp;
  }

  getXpToNextLevel(): number {
    return xpRequiredForLevel(this.level + 1) - xpRequiredForLevel(this.level);
  }

  addXP(amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('XP amount must be a non-negative finite number.');
    }
    this.xp += amount;
    this.checkLevelUp();
  }

  completeMission(scoreResult: ScoreResult): void {
    this.missionsCompleted++;
    this.totalScore += scoreResult.total;
    // Convert normalized score to XP: e.g., 1000 XP per point
    const gainedXP = Math.round(scoreResult.normalized * 1000);
    this.addXP(gainedXP);
  }

  unlockAchievement(id: string): void {
    if (!id || id.trim() === '') {
      throw new Error('Achievement id must be a non-empty string.');
    }
    this.achievements.add(id);
  }

  hasAchievement(id: string): boolean {
    return this.achievements.has(id);
  }

  getAchievements(): string[] {
    return Array.from(this.achievements).sort();
  }

  unlock(id: string): void {
    if (!id || id.trim() === '') {
      throw new Error('Unlock id must be a non-empty string.');
    }
    this.unlocks.add(id);
  }

  hasUnlock(id: string): boolean {
    return this.unlocks.has(id);
  }

  getUnlocks(): string[] {
    return Array.from(this.unlocks).sort();
  }

  getStats(): PlayerStats {
    return {
      totalMissionsCompleted: this.missionsCompleted,
      totalScore: this.totalScore,
      totalXP: this.xp,
      level: this.level,
      xpToNextLevel: this.getXpToNextLevel(),
      achievements: this.getAchievements(),
      unlocks: this.getUnlocks(),
    };
  }

  private checkLevelUp(): void {
    while (this.xp >= xpRequiredForLevel(this.level + 1)) {
      this.level++;
    }
  }

  toJSON(): PlayerStats {
    return this.getStats();
  }
}

/**
 * XP required to reach a given level (cumulative).
 * Levels are progressive: each level requires more XP.
 * Example: level 1 requires 0, level 2 requires 1000, level 3 requires 3000, etc.
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  // Simple quadratic progression
  return Math.floor(1000 * Math.pow(level - 1, 1.5));
}
