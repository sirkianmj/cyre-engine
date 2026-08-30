/**
 * Evidence
 * ---------
 * A piece of evidence in a cyber investigation.
 * Evidence is data the player can discover, interpret, and use to solve missions.
 */

import { EvidenceType, isEvidenceType } from './EvidenceType.js';

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  sourceId?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export function createEvidence(
  id: string,
  type: EvidenceType,
  title: string,
  description: string,
  options: {
    sourceId?: string;
    timestamp?: number;
    data?: Record<string, unknown>;
  } = {},
): Evidence {
  if (!id || id.trim() === '') {
    throw new Error('Evidence id must be a non-empty string.');
  }
  if (!isEvidenceType(type)) {
    throw new Error(`Invalid evidence type: ${type}`);
  }
  if (!title || title.trim() === '') {
    throw new Error('Evidence title must be a non-empty string.');
  }
  if (!description || description.trim() === '') {
    throw new Error('Evidence description must be a non-empty string.');
  }
  if (options.timestamp !== undefined && !Number.isInteger(options.timestamp)) {
    throw new Error('Evidence timestamp must be an integer if provided.');
  }
  if (options.sourceId !== undefined && options.sourceId.trim() === '') {
    throw new Error('Evidence sourceId cannot be empty if provided.');
  }
  return {
    id,
    type,
    title,
    description,
    sourceId: options.sourceId,
    timestamp: options.timestamp,
    data: options.data,
  };
}
