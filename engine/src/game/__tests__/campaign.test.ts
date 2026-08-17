import { describe, it, expect } from 'vitest';
import {
  Campaign,
  Difficulty,
  DIFFICULTY_SETTINGS,
  MissionFactory,
  type ScoringMetrics,
} from '../index.js';

describe('Difficulty', () => {
  it('has expected settings', () => {
    expect(DIFFICULTY_SETTINGS[Difficulty.Easy].scoreMultiplier).toBeGreaterThan(1);
    expect(DIFFICULTY_SETTINGS[Difficulty.Expert].scoreMultiplier).toBeLessThan(1);
  });
});

describe('Campaign', () => {
  const campaignMissions = ['mission-001', 'mission-002', 'mission-003'];

  it('creates a campaign with missions', () => {
    const campaign = new Campaign('camp-1', 'Test Campaign', campaignMissions);
    expect(campaign.getMissionIds()).toHaveLength(3);
    expect(campaign.getCurrentMissionId()).toBe('mission-001');
    expect(campaign.isComplete()).toBe(false);
  });

  it('throws on empty mission list', () => {
    expect(() => new Campaign('c1', 'Empty', [])).toThrow(/at least one mission/);
  });

  it('throws on unregistered mission', () => {
    expect(() => new Campaign('c1', 'Bad', ['nonexistent'])).toThrow(/not registered/);
  });

  it('only allows available missions to be run', () => {
    const campaign = new Campaign('camp-1', 'Test', campaignMissions);
    expect(campaign.getAvailableMissionIds()).toEqual(['mission-001']);
    expect(() => campaign.createMissionRunner('mission-002')).toThrow(/not available/);
  });

  it('completes mission, awards XP, and advances', () => {
    const campaign = new Campaign('camp-1', 'Test', campaignMissions, {
      difficulty: Difficulty.Normal,
      achievementMap: { 'mission-001': ['first_done'] },
    });
    const runner = campaign.createMissionRunner('mission-001');
    runner.start();
    runner.completeMission();

    const metrics: ScoringMetrics = {
      accuracy: 1,
      responseTimeMs: 1000,
      damage: 0,
      evidenceQuality: 1,
      penalties: 0,
    };
    campaign.completeCurrentMission(metrics);

    expect(campaign.getCompletedMissionIds()).toContain('mission-001');
    expect(campaign.getCurrentMissionId()).toBe('mission-002');
    expect(campaign.getPlayer().hasAchievement('first_done')).toBe(true);
    expect(campaign.getPlayer().getXP()).toBeGreaterThan(0);
  });

  it('applies difficulty score multiplier and caps at maxTotal', () => {
    const easyCampaign = new Campaign('camp-easy', 'Easy', campaignMissions, {
      difficulty: Difficulty.Easy,
    });
    const metrics: ScoringMetrics = {
      accuracy: 1,
      responseTimeMs: 0,
      damage: 0,
      evidenceQuality: 1,
      penalties: 0,
    };
    const runner = easyCampaign.createMissionRunner('mission-001');
    runner.start();
    runner.completeMission();
    const result = easyCampaign.completeCurrentMission(metrics);
    // With Easy multiplier 1.2, the raw 0.95 would become 1.14, but capped at maxTotal 0.95
    expect(result.total).toBeCloseTo(0.95);
  });

  it('skips mission and advances', () => {
    const campaign = new Campaign('camp-skip', 'Skip', campaignMissions);
    campaign.skipCurrentMission();
    expect(campaign.getCompletedMissionIds()).toContain('mission-001');
    expect(campaign.getCurrentMissionId()).toBe('mission-002');
  });

  it('campaign completes after all missions done', () => {
    const campaign = new Campaign('camp-full', 'Full', campaignMissions);
    for (const missionId of campaignMissions) {
      const runner = campaign.createMissionRunner(missionId);
      runner.start();
      runner.completeMission();
      campaign.completeCurrentMission({
        accuracy: 1,
        responseTimeMs: 100,
        damage: 0,
        evidenceQuality: 1,
        penalties: 0,
      });
    }
    expect(campaign.isComplete()).toBe(true);
    expect(campaign.getCurrentMissionId()).toBeNull();
  });
});
