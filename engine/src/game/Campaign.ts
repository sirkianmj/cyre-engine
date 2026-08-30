/**
 * Campaign
 * --------
 * Manages a sequence of missions as a campaign.
 * Tracks current mission, completed missions, and unlocks achievements.
 */

import { Difficulty, DIFFICULTY_SETTINGS, type DifficultySettings } from './Difficulty.js';
import { MissionFactory } from './MissionFactory.js';
import { MissionRunner } from './MissionRunner.js';
import { PlayerProgression } from './PlayerProgression.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import type { ScoreResult } from './ScoringTypes.js';

export interface CampaignProgress {
  campaignId: string;
  currentMissionId: string | null;
  completedMissionIds: string[];
  availableMissionIds: string[];
  isComplete: boolean;
  difficulty: Difficulty;
}

export class Campaign {
  readonly id: string;
  readonly name: string;
  readonly difficulty: Difficulty;
  private missionIds: string[];
  private currentIndex: number = 0;
  private completedMissionIds: Set<string> = new Set();
  private player: PlayerProgression;
  private scoreCalculator: ScoreCalculator;
  private achievementMap: Record<string, string[]> = {};

  constructor(
    id: string,
    name: string,
    missionIds: string[],
    options: {
      difficulty?: Difficulty;
      player?: PlayerProgression;
      achievementMap?: Record<string, string[]>;
    } = {},
  ) {
    if (!id || id.trim() === '') {
      throw new Error('Campaign id must be a non-empty string.');
    }
    if (!name || name.trim() === '') {
      throw new Error('Campaign name must be a non-empty string.');
    }
    if (!Array.isArray(missionIds) || missionIds.length === 0) {
      throw new Error('Campaign must have at least one mission.');
    }
    for (const missionId of missionIds) {
      if (!MissionFactory.has(missionId)) {
        throw new Error(`Mission "${missionId}" is not registered.`);
      }
    }
    this.id = id;
    this.name = name;
    this.difficulty = options.difficulty ?? Difficulty.Normal;
    this.missionIds = [...missionIds];
    this.player = options.player ?? new PlayerProgression();
    this.scoreCalculator = new ScoreCalculator();
    if (options.achievementMap) {
      this.achievementMap = { ...options.achievementMap };
    }
  }

  getDifficultySettings(): DifficultySettings {
    return DIFFICULTY_SETTINGS[this.difficulty];
  }

  getCurrentMissionId(): string | null {
    if (this.isComplete()) return null;
    return this.missionIds[this.currentIndex] ?? null;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getMissionIds(): string[] {
    return [...this.missionIds];
  }

  getCompletedMissionIds(): string[] {
    return Array.from(this.completedMissionIds);
  }

  getAvailableMissionIds(): string[] {
    const available: string[] = [];
    for (let i = 0; i <= this.currentIndex && i < this.missionIds.length; i++) {
      available.push(this.missionIds[i]);
    }
    return available;
  }

  isComplete(): boolean {
    return this.completedMissionIds.size === this.missionIds.length;
  }

  getPlayer(): PlayerProgression {
    return this.player;
  }

  /**
   * Create a MissionRunner for a specific mission in the campaign.
   * Only available missions can be run.
   */
  createMissionRunner(missionId: string): MissionRunner {
    if (!this.getAvailableMissionIds().includes(missionId)) {
      throw new Error(`Mission "${missionId}" is not available yet.`);
    }
    const scenario = MissionFactory.create(missionId);
    return new MissionRunner(scenario);
  }

  /**
   * Complete the current mission with given metrics.
   * Awards XP (with difficulty score multiplier), unlocks achievements,
   * and advances to the next mission.
   *
   * @returns Final ScoreResult after applying difficulty.
   */
  completeCurrentMission(metrics: Parameters<ScoreCalculator['calculate']>[0]): ScoreResult {
    const missionId = this.getCurrentMissionId();
    if (!missionId) {
      throw new Error('No current mission to complete.');
    }

    const baseScore = this.scoreCalculator.calculate(metrics);
    const settings = this.getDifficultySettings();
    const adjustedTotal = Math.min(
      baseScore.maxTotal,
      baseScore.total * settings.scoreMultiplier,
    );
    const adjustedScore: ScoreResult = {
      ...baseScore,
      total: adjustedTotal,
      normalized: adjustedTotal / baseScore.maxTotal,
    };

    // Award XP based on final normalized score
    this.player.completeMission(adjustedScore);

    // Mark mission completed
    this.completedMissionIds.add(missionId);

    // Unlock achievements if mapped
    const achievements = this.achievementMap[missionId];
    if (achievements) {
      for (const achievementId of achievements) {
        this.player.unlockAchievement(achievementId);
      }
    }

    // Advance to next available mission
    this.advanceToNextIncomplete();

    return adjustedScore;
  }

  /**
   * Skip the current mission (for development or testing).
   * Does not award XP/achievements, but advances to next.
   */
  skipCurrentMission(): void {
    const missionId = this.getCurrentMissionId();
    if (!missionId) {
      throw new Error('No current mission to skip.');
    }
    this.completedMissionIds.add(missionId);
    this.advanceToNextIncomplete();
  }

  reset(): void {
    this.currentIndex = 0;
    this.completedMissionIds.clear();
    this.player = new PlayerProgression();
  }

  getProgress(): CampaignProgress {
    return {
      campaignId: this.id,
      currentMissionId: this.getCurrentMissionId(),
      completedMissionIds: this.getCompletedMissionIds(),
      availableMissionIds: this.getAvailableMissionIds(),
      isComplete: this.isComplete(),
      difficulty: this.difficulty,
    };
  }

  private advanceToNextIncomplete(): void {
    while (
      this.currentIndex < this.missionIds.length &&
      this.completedMissionIds.has(this.missionIds[this.currentIndex])
    ) {
      this.currentIndex++;
    }
    if (this.currentIndex >= this.missionIds.length) {
      this.currentIndex = this.missionIds.length;
    }
  }

  toJSON(): CampaignProgress {
    return this.getProgress();
  }
}
