/**
 * Hypothesis
 * ----------
 * Represents an investigator's hypothesis about the incident.
 * Tracks confidence and status (proposed/confirmed/rejected).
 */

export type HypothesisStatus = 'proposed' | 'confirmed' | 'rejected';

export class Hypothesis {
  readonly id: string;
  readonly description: string;
  private confidence: number;
  private status: HypothesisStatus;
  readonly linkedEvidenceIds: string[];
  readonly linkedAttackGraphNodeIds: string[];

  constructor(
    id: string,
    description: string,
    options: {
      confidence?: number;
      linkedEvidenceIds?: string[];
      linkedAttackGraphNodeIds?: string[];
    } = {},
  ) {
    if (!id || id.trim() === '') {
      throw new Error('Hypothesis id must be a non-empty string.');
    }
    if (!description || description.trim() === '') {
      throw new Error('Hypothesis description must be a non-empty string.');
    }
    const confidence = options.confidence ?? 0.5;
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      throw new Error('Hypothesis confidence must be a number between 0 and 1.');
    }
    this.id = id;
    this.description = description;
    this.confidence = confidence;
    this.status = 'proposed';
    this.linkedEvidenceIds = options.linkedEvidenceIds ? [...options.linkedEvidenceIds] : [];
    this.linkedAttackGraphNodeIds = options.linkedAttackGraphNodeIds ? [...options.linkedAttackGraphNodeIds] : [];
  }

  getConfidence(): number {
    return this.confidence;
  }

  getStatus(): HypothesisStatus {
    return this.status;
  }

  updateConfidence(newConfidence: number): void {
    if (typeof newConfidence !== 'number' || newConfidence < 0 || newConfidence > 1) {
      throw new Error('Confidence must be between 0 and 1.');
    }
    if (this.status !== 'proposed') {
      throw new Error(`Cannot update confidence of hypothesis in status "${this.status}".`);
    }
    this.confidence = newConfidence;
  }

  confirm(): void {
    if (this.status !== 'proposed') {
      throw new Error(`Cannot confirm hypothesis in status "${this.status}".`);
    }
    this.status = 'confirmed';
  }

  reject(): void {
    if (this.status !== 'proposed') {
      throw new Error(`Cannot reject hypothesis in status "${this.status}".`);
    }
    this.status = 'rejected';
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      description: this.description,
      confidence: this.confidence,
      status: this.status,
      linkedEvidenceIds: this.linkedEvidenceIds,
      linkedAttackGraphNodeIds: this.linkedAttackGraphNodeIds,
    };
  }
}
