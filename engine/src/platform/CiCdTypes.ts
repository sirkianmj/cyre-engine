export const CI_CD_STAGES = [
  'validate',
  'build',
  'package',
  'report',
] as const;

export type CiCdStage = (typeof CI_CD_STAGES)[number];

export type CiCdStageStatus = 'succeeded' | 'failed' | 'skipped';

export interface CiCdStageResult {
  stage: CiCdStage;
  status: CiCdStageStatus;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  message?: string;
  data?: Record<string, unknown>;
}

export interface CiCdPipelineResult {
  success: boolean;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  profileIds: string[];
  packageCount: number;
  stages: CiCdStageResult[];
}
