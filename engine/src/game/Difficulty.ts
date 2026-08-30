/**
 * Difficulty
 * -----------
 * Defines difficulty levels and their effects on scoring and time limits.
 */

export enum Difficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
  Expert = 'expert',
}

export interface DifficultySettings {
  label: string;
  /** Multiplier applied to the mission score (1.0 = no change) */
  scoreMultiplier: number;
  /** Multiplier applied to the mission time limit (1.0 = no change) */
  timeMultiplier: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  [Difficulty.Easy]: {
    label: 'Easy',
    scoreMultiplier: 1.2,
    timeMultiplier: 1.5,
  },
  [Difficulty.Normal]: {
    label: 'Normal',
    scoreMultiplier: 1.0,
    timeMultiplier: 1.0,
  },
  [Difficulty.Hard]: {
    label: 'Hard',
    scoreMultiplier: 0.8,
    timeMultiplier: 0.75,
  },
  [Difficulty.Expert]: {
    label: 'Expert',
    scoreMultiplier: 0.6,
    timeMultiplier: 0.5,
  },
};
