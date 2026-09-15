'use strict';
const { answerIsCorrect } = require('./challenge-policy');

const SCENE_ID = 'kitchen-2';
const VOCABULARY_IDS = [
  'kitchen-fridge','kitchen-sink','kitchen-oven','kitchen-hob','kitchen-kettle','kitchen-pan',
  'kitchen-chopping-board','kitchen-cupboard','kitchen-spatula','kitchen-microwave',
];
const vocabulary = new Set(VOCABULARY_IDS);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function cleanQuestion(question, attemptId) {
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
    || value.sceneId !== SCENE_ID || !finite(value.startedAt) || !(value.completedAt === null || finite(value.completedAt))
    || !['full', 'weak'].includes(value.kind || 'full') || !Array.isArray(value.questions)
    || !value.questions.length || value.questions.length > VOCABULARY_IDS.length) return null;
  const questions = value.questions.map(question => cleanQuestion(question, value.attemptId));
  if (questions.some(question => !question)) return null;
  const ids = new Set(questions.map(question => question.vocabularyId));
  const kind = value.kind || 'full';
  if (ids.size !== questions.length || (kind === 'full'
    && (ids.size !== VOCABULARY_IDS.length || VOCABULARY_IDS.some(id => !ids.has(id))))) return null;
  const completed = questions.every(question => question.answers.some(answer => answer.correct));
  const completedAt = completed ? Math.max(...questions.flatMap(question => question.answers.map(answer => answer.at))) : null;
  return { attemptId: value.attemptId, sceneId: SCENE_ID, kind, questions, startedAt: value.startedAt, completedAt };
}

function attemptStats(attempt) {
  const remembered = attempt.questions.filter(question => question.answers[0]?.correct === true).map(question => question.vocabularyId);
  const needsPractice = attempt.questions.filter(question => question.answers[0]?.correct === false).map(question => question.vocabularyId);
  return {
    firstAttemptResults: attempt.questions.map(question => ({ vocabularyId: question.vocabularyId, correct: question.answers[0]?.correct === true })),
    score: remembered.length, remembered, needsPractice,
  };
}

module.exports = { SCENE_ID, VOCABULARY_IDS, vocabulary, object, finite, cleanAttempt, attemptStats };
