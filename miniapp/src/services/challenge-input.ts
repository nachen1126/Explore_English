export const CONFIRM_GUARD_MS = 350;

export type ConfirmAction = 'ignore' | 'submit' | 'next' | 'results';

export function challengeConfirmAction(options: {
  solved: boolean;
  isLastQuestion: boolean;
  value: string;
}): ConfirmAction {
  if (options.solved) return options.isLastQuestion ? 'results' : 'next';
  return /[\p{L}\p{N}]/u.test(options.value) ? 'submit' : 'ignore';
}

/**
 * WeChat can deliver repeated confirm events when the keyboard confirm key is
 * held down. Keep the guard independent from React render timing so one event
 * cannot submit or advance the same question twice.
 */
export class ChallengeInputGuard {
  private questionId = '';
  private submitLockedUntil = 0;
  private advanced = false;

  reset(questionId: string) {
    this.questionId = questionId;
    this.submitLockedUntil = 0;
    this.advanced = false;
  }

  beginSubmit(questionId: string, value: string, now = Date.now()): boolean {
    if (questionId !== this.questionId || !/[\p{L}\p{N}]/u.test(value) || now < this.submitLockedUntil) return false;
    this.submitLockedUntil = now + CONFIRM_GUARD_MS;
    return true;
  }

  beginAdvance(questionId: string, now = Date.now()): boolean {
    if (questionId !== this.questionId || this.advanced || now < this.submitLockedUntil) return false;
    this.advanced = true;
    return true;
  }
}
