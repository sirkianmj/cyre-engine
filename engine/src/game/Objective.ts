/**
 * Objective
 * ----------
 * Represents a mission objective in a CYRE game.
 */

export interface Objective {
  id: string;
  description: string;
  /** Optional type for categorisation */
  type?: string;
  /** Whether the objective has been completed */
  isCompleted: boolean;
}

export function createObjective(
  id: string,
  description: string,
  options: { type?: string; isCompleted?: boolean } = {},
): Objective {
  if (!id || id.trim() === '') {
    throw new Error('Objective id must be a non-empty string.');
  }
  if (!description || description.trim() === '') {
    throw new Error('Objective description must be a non-empty string.');
  }
  return {
    id,
    description,
    type: options.type,
    isCompleted: options.isCompleted ?? false,
  };
}
