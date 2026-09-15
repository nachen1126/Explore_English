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

export function createChallenge(scene: Scene, attemptId: string, now: number, random = Math.random): ChallengeAttempt {
  const ids = [...scene.vocabularyIds];
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
  }
  return {
    attemptId, sceneId: scene.id, startedAt: now, completedAt: null,
    questions: ids.map((vocabularyId, index) => ({
      id: `${attemptId}-${index}`, vocabularyId, mode: index < Math.ceil(ids.length / 2) ? 'find' : 'produce', answers: [],
    })),
  };
}

export function isQuestionSolved(question: ChallengeQuestion): boolean {
  return question.answers.some(answer => answer.correct);
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

export function summarizeChallenge(attempt: ChallengeAttempt) {
  const remembered = attempt.questions.filter(question => question.answers[0]?.correct === true);
  const needsPractice = attempt.questions.filter(question => question.answers[0]?.correct === false);
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
