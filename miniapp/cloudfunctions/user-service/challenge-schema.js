'use strict';
const catalog = require('./catalog.generated.json');
const { answerIsCorrect } = require('./challenge-policy');

const sceneVocabulary = new Map(catalog.scenes.map(scene => [scene.id, scene.vocabularyIds]));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function cleanQuestion(question, attemptId, vocabulary) {
  if (!object(question) || typeof question.id !== 'string' || !question.id.startsWith(`${attemptId}-`)
    || typeof question.vocabularyId !== 'string' || !vocabulary.has(question.vocabularyId)
    || !['find', 'produce'].includes(question.mode) || !Array.isArray(question.answers)) return null;
  const recognitionIds = new Set();
  const answers = [];
  for (const answer of question.answers) {
    if (!object(answer) || typeof answer.answer !== 'string' || answer.answer.length > 120
      || typeof answer.correct !== 'boolean' || !finite(answer.at)
      || !['hotspot', 'typing', 'speech'].includes(answer.source)) return null;
    if (answer.recognitionId !== undefined) {
      if (answer.source !== 'speech' || typeof answer.recognitionId !== 'string' || recognitionIds.has(answer.recognitionId)) return null;
      recognitionIds.add(answer.recognitionId);
    }
    answers.push({ answer: answer.answer,
      correct: answerIsCorrect(answer.answer, answer.source, question.vocabularyId), at: answer.at, source: answer.source,
      ...(answer.recognitionId ? { recognitionId: answer.recognitionId } : {}) });
  }
  const cleaned = { id: question.id, vocabularyId: question.vocabularyId, mode: question.mode, answers };
  const wrongCount = answers.filter(answer => !answer.correct).length;
  if (question.revealedAt !== undefined) {
    if (question.mode !== 'produce' || wrongCount < 3 || !finite(question.revealedAt)
      || question.answerRequiredAfterReveal !== true) return null;
    cleaned.revealedAt = question.revealedAt;
    cleaned.answerRequiredAfterReveal = true;
  }
  return cleaned;
}

function cleanAttempt(value) {
  if (!object(value) || typeof value.attemptId !== 'string' || value.attemptId.length > 80
    || typeof value.sceneId !== 'string' || !finite(value.startedAt)
    || !(value.completedAt === null || finite(value.completedAt))
    || !['full', 'weak'].includes(value.kind || 'full') || !Array.isArray(value.questions)) return null;
  const vocabularyIds = sceneVocabulary.get(value.sceneId);
  if (!vocabularyIds || !value.questions.length || value.questions.length > vocabularyIds.length) return null;
  const vocabulary = new Set(vocabularyIds);
  const questions = value.questions.map(question => cleanQuestion(question, value.attemptId, vocabulary));
  if (questions.some(question => !question)) return null;
  const ids = new Set(questions.map(question => question.vocabularyId));
  const kind = value.kind || 'full';
  if (ids.size !== questions.length || (kind === 'full'
    && (ids.size !== vocabularyIds.length || vocabularyIds.some(id => !ids.has(id))))) return null;
  const completed = questions.every(question => question.answers.some(answer => answer.correct));
  const completedAt = completed ? Math.max(...questions.flatMap(question => question.answers.map(answer => answer.at))) : null;
  return { attemptId: value.attemptId, sceneId: value.sceneId, kind, questions, startedAt: value.startedAt, completedAt };
}

function attemptStats(attempt) {
  const remembered = attempt.questions.filter(question => question.answers[0]?.correct === true).map(question => question.vocabularyId);
  const needsPractice = attempt.questions.filter(question => question.answers[0]?.correct === false).map(question => question.vocabularyId);
  return {
    firstAttemptResults: attempt.questions.map(question => ({ vocabularyId: question.vocabularyId, correct: question.answers[0]?.correct === true })),
    score: remembered.length, remembered, needsPractice,
  };
}

module.exports = { sceneVocabulary, object, finite, cleanAttempt, attemptStats };
