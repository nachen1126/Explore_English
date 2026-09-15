import type { AnswerRecord, ChallengeAttempt, ChallengeQuestion, Scene, VocabularyItem } from './types';

export function normalizeAnswer(answer: string): string {
  return answer.normalize('NFKC').toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ').trim()
    .replace(/^(?:(?:it is|its|this is|that is) )?(?:(?:a|an|the) )?/, '');
}

export function matchesAnswer(answer: string, item: VocabularyItem): boolean {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && [item.word, ...item.acceptedAnswers].some(value => normalizeAnswer(value) === normalized);
}

export function createChallenge(
  scene: Scene,
  attemptId: string,
  now: number,
  random = Math.random,
  kind: ChallengeAttempt['kind'] = 'full',
  selectedVocabularyIds: string[] = scene.vocabularyIds,
): ChallengeAttempt {
  const allowed = new Set(scene.vocabularyIds);
  const ids = [...new Set(selectedVocabularyIds)].filter(id => allowed.has(id));
  if (!ids.length) throw new Error('This challenge has no words to practise.');
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
  }
  return {
    attemptId, sceneId: scene.id, kind, startedAt: now, completedAt: null,
    questions: ids.map((vocabularyId, index) => ({
      id: `${attemptId}-${index}`, vocabularyId, mode: index < Math.ceil(ids.length / 2) ? 'find' : 'produce', answers: [],
    })),
  };
}

export const wrongChallengeAttempts = (question: ChallengeQuestion) => question.answers.filter(answer => !answer.correct).length;

export const hasChallengeHint = (question: ChallengeQuestion) => question.mode === 'produce' && wrongChallengeAttempts(question) >= 3;

export function isQuestionSolved(question: ChallengeQuestion): boolean {
  return question.answers.some(answer => answer.correct)
    || (question.revealedAt !== undefined && question.answerRequiredAfterReveal !== true);
}

export function currentChallengeQuestion(attempt: ChallengeAttempt): ChallengeQuestion | undefined {
  return attempt.questions.find(question => !isQuestionSolved(question));
}

export function recordChallengeAnswer(attempt: ChallengeAttempt, questionId: string, record: AnswerRecord): ChallengeAttempt {
  if (attempt.completedAt !== null || !/[\p{L}\p{N}]/u.test(record.answer)) return attempt;
  const current = currentChallengeQuestion(attempt);
  if (!current || current.id !== questionId) return attempt;
  if (record.recognitionId && current.answers.some(answer => answer.recognitionId === record.recognitionId)) return attempt;
  const questions = attempt.questions.map(question => question.id === questionId
    ? { ...question, answers: [...question.answers, record] } : question);
  return { ...attempt, questions, completedAt: questions.every(isQuestionSolved) ? record.at : null };
}

export function revealChallengeAnswer(attempt: ChallengeAttempt, questionId: string, at: number): ChallengeAttempt {
  if (attempt.completedAt !== null) return attempt;
  const current = currentChallengeQuestion(attempt);
  if (!current || current.id !== questionId || !hasChallengeHint(current) || current.revealedAt !== undefined) return attempt;
  const questions = attempt.questions.map(question => question.id === questionId
    ? { ...question, revealedAt: at, answerRequiredAfterReveal: true as const } : question);
  return { ...attempt, questions };
}

export function weakVocabularyIds(attempts: ChallengeAttempt[]): string[] {
  const latest = new Map<string, { at: number; weak: boolean }>();
  for (const attempt of attempts) for (const question of attempt.questions) {
    const first = question.answers[0];
    if (!first) continue;
    const previous = latest.get(question.vocabularyId);
    if (!previous || previous.at < first.at) latest.set(question.vocabularyId, {
      at: first.at,
      weak: !first.correct || question.revealedAt !== undefined || hasChallengeHint(question),
    });
  }
  return [...latest].filter(([, value]) => value.weak).map(([id]) => id);
}

export function summarizeChallenge(attempt: ChallengeAttempt) {
  const remembered = attempt.questions.filter(question => question.answers[0]?.correct === true
    && question.revealedAt === undefined && !hasChallengeHint(question));
  const needsPractice = attempt.questions.filter(question => question.answers[0]?.correct === false
    || question.revealedAt !== undefined || hasChallengeHint(question));
  return {
    score: remembered.length,
    total: attempt.questions.length,
    accuracy: attempt.questions.length ? Math.round(remembered.length / attempt.questions.length * 100) : 0,
    remembered: remembered.map(question => question.vocabularyId),
    needsPractice: needsPractice.map(question => question.vocabularyId),
    firstAttemptResults: attempt.questions.map(question => ({
      vocabularyId: question.vocabularyId, correct: question.answers[0]?.correct === true,
    })),
  };
}
