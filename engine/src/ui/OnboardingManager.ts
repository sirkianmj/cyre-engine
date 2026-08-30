/**
 * OnboardingManager
 * ------------------
 * Manages tutorial/onboarding steps and tracks completion.
 */

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  /** Optional target UI component id */
  target?: string;
}

export class OnboardingManager {
  private steps: OnboardingStep[];
  private currentIndex: number;
  private completed: Set<string>;

  constructor(steps: OnboardingStep[]) {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Onboarding steps must be a non-empty array.');
    }
    for (const step of steps) {
      if (!step.id || !step.title || !step.content) {
        throw new Error('Onboarding steps must have id, title, and content.');
      }
    }
    this.steps = [...steps];
    this.currentIndex = 0;
    this.completed = new Set();
  }

  getCurrentStep(): OnboardingStep | null {
    if (this.currentIndex >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentIndex];
  }

  completeCurrentStep(): void {
    const current = this.getCurrentStep();
    if (!current) {
      throw new Error('No current onboarding step to complete.');
    }
    this.completed.add(current.id);
    this.currentIndex++;
  }

  skipCurrentStep(): void {
    if (this.currentIndex >= this.steps.length) {
      throw new Error('No current onboarding step to skip.');
    }
    this.currentIndex++;
  }

  isComplete(): boolean {
    return this.currentIndex >= this.steps.length && this.completed.size === this.steps.length;
  }

  getProgress(): { currentIndex: number; total: number; completed: string[] } {
    return {
      currentIndex: this.currentIndex,
      total: this.steps.length,
      completed: Array.from(this.completed),
    };
  }

  reset(): void {
    this.currentIndex = 0;
    this.completed.clear();
  }

  render(): Record<string, unknown> {
    return {
      type: 'onboarding',
      currentStep: this.getCurrentStep(),
      progress: this.getProgress(),
    };
  }
}
