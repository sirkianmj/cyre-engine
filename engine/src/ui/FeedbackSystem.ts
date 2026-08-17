/**
 * FeedbackSystem
 * ---------------
 * Provides user feedback (success, error, warning, info) and stores messages.
 */

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  text: string;
  timestamp: number;
  read: boolean;
}

export class FeedbackSystem {
  private messages: FeedbackMessage[] = [];
  private counter = 0;

  /**
   * Add a feedback message.
   * @returns The created message ID.
   */
  add(type: FeedbackType, text: string, timestamp: number = Date.now()): string {
    if (!text || text.trim() === '') {
      throw new Error('Feedback text must be a non-empty string.');
    }
    if (!['success', 'error', 'warning', 'info'].includes(type)) {
      throw new Error('Invalid feedback type.');
    }
    const id = `feedback-${++this.counter}`;
    this.messages.push({
      id,
      type,
      text,
      timestamp,
      read: false,
    });
    return id;
  }

  markRead(id: string): void {
    const message = this.messages.find((m) => m.id === id);
    if (!message) {
      throw new Error(`Feedback message "${id}" not found.`);
    }
    message.read = true;
  }

  getUnread(): FeedbackMessage[] {
    return this.messages.filter((m) => !m.read);
  }

  getAll(): FeedbackMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages.length = 0;
  }

  render(): Record<string, unknown> {
    return {
      type: 'feedback',
      messages: this.messages,
    };
  }
}
