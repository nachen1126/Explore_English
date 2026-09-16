export const FIND_CORRECT_ADVANCE_MS = 600;
export const FIND_AUTO_PLAY_DELAY_MS = 80;

/** Keeps automatic playback and the correct-answer transition idempotent. */
export class ListenFindGuard {
  private readonly autoPlayedQuestions = new Set<string>();
  private readonly lockedQuestions = new Set<string>();

  requestAutoPlay(questionId: string): boolean {
    if (!questionId || this.autoPlayedQuestions.has(questionId)) return false;
    this.autoPlayedQuestions.add(questionId);
    return true;
  }

  lockCorrectAnswer(questionId: string): boolean {
    if (!questionId || this.lockedQuestions.has(questionId)) return false;
    this.lockedQuestions.add(questionId);
    return true;
  }

  isLocked(questionId: string): boolean {
    return this.lockedQuestions.has(questionId);
  }
}
