import type { ChallengeAttempt, ChallengeQuestion, LearningState, Scene, VocabularyItem, AnswerRecord } from './types';

export const SCHEMA_VERSION = 2 as const;
export const STORAGE_KEY = 'explore-english-v2';
export const LEGACY_KEY = 'explore-english-v1';
const LEGACY_VOCABULARY_IDS: Record<string, string> = {
  'airport-bag': 'airport-travel-bag',
  'airport-bottle': 'airport-water-bottle',
  'gym-bag': 'gym-gym-bag',
  'gym-bottle': 'gym-water-bottle',
  'supermarket-bag': 'supermarket-shopping-bag',
};
export const emptyState = (): LearningState => ({ schemaVersion: SCHEMA_VERSION, scenes: {}, attempts: {} });

export function normalize(answer: string): string {
  return answer.normalize('NFKC').toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ').trim()
    .replace(/^(?:(?:it is|its|this is|that is) )?(?:(?:a|an|the) )?/, '');
}
export const matches = (answer: string, item: VocabularyItem): boolean => {
  const normalized = normalize(answer);
  return normalized.length > 0 && [item.word, ...item.acceptedAnswers].some(value => normalize(value) === normalized);
};
export const wrongAttempts = (question: ChallengeQuestion) => question.answers.filter(answer => !answer.correct).length;
export const hasHint = (question: ChallengeQuestion) => question.mode === 'produce' && wrongAttempts(question) >= 3;
export const isSolved = (question: ChallengeQuestion) => question.revealedAt !== undefined || question.answers.some(answer => answer.correct);
export const currentQuestion = (attempt: ChallengeAttempt) => attempt.questions.find(question => !isSolved(question));
export const summarize = (attempt: ChallengeAttempt) => {
  const remembered = attempt.questions.filter(question => question.answers[0]?.correct === true && question.revealedAt === undefined && !hasHint(question));
  const weak = attempt.questions.filter(question => question.answers[0]?.correct === false || question.revealedAt !== undefined);
  return {
    score: remembered.length,
    total: attempt.questions.length,
    accuracy: attempt.questions.length ? Math.round(remembered.length / attempt.questions.length * 100) : 0,
    remembered: remembered.map(question => question.vocabularyId),
    weak: weak.map(question => question.vocabularyId),
  };
};
export function weakVocabulary(state: LearningState): string[] {
  const latest = new Map<string, { at: number; weak: boolean }>();
  Object.values(state.attempts).forEach(attempt => attempt.questions.forEach(question => {
    const first = question.answers[0];
    if (first && (!latest.has(question.vocabularyId) || latest.get(question.vocabularyId)!.at < first.at)) {
      latest.set(question.vocabularyId, { at: first.at, weak: !first.correct || hasHint(question) || question.revealedAt !== undefined });
    }
  }));
  return [...latest].filter(([, value]) => value.weak).map(([id]) => id);
}
export function createAttempt(scene: Scene, weak: string[] = [], kind: 'full' | 'weak' = 'full', random = Math.random): ChallengeAttempt {
  const ids = scene.vocabularyIds.filter(id => kind === 'full' || weak.includes(id));
  if (!ids.length) throw new Error('This scene has no words to practise.');
  // Fisher–Yates runs only on the Start event, never during render.
  for (let index = ids.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
  }
  // Stable sorting keeps the random order within each priority group.
  ids.sort((a, b) => Number(weak.includes(b)) - Number(weak.includes(a)));
  const id = crypto.randomUUID();
  return {
    id, sceneId: scene.id, kind, createdAt: Date.now(), completedAt: null,
    questions: ids.map((vocabularyId, index) => ({
      id: `${id}-${index}`, vocabularyId,
      mode: index < Math.ceil(ids.length / 2) ? 'find' : 'produce', answers: [],
    })),
  };
}
export type Action =
  | { type: 'visit'; sceneId: string; at: number }
  | { type: 'discover'; sceneId: string; vocabularyId: string; at: number }
  | { type: 'restart'; sceneId: string }
  | { type: 'start'; attempt: ChallengeAttempt }
  | { type: 'reveal'; attemptId: string; questionId: string; at: number }
  | { type: 'answer'; attemptId: string; questionId: string; record: AnswerRecord };
export function learningReducer(state: LearningState, action: Action): LearningState {
  switch (action.type) {
    case 'visit': {
      const progress = state.scenes[action.sceneId];
      return { ...state, scenes: { ...state.scenes, [action.sceneId]: { explored: progress?.explored ?? [], lastVisited: action.at } } };
    }
    case 'discover': {
      const progress = state.scenes[action.sceneId];
      const explored = progress?.explored ?? [];
      return { ...state, scenes: { ...state.scenes, [action.sceneId]: {
        explored: explored.includes(action.vocabularyId) ? explored : [...explored, action.vocabularyId], lastVisited: action.at,
      } } };
    }
    case 'restart':
      return { ...state, scenes: { ...state.scenes, [action.sceneId]: { explored: [], lastVisited: Date.now() } } };
    case 'start':
      return { ...state, attempts: { ...state.attempts, [action.attempt.id]: action.attempt } };
    case 'answer': {
      const attempt = state.attempts[action.attemptId];
      if (!attempt || attempt.completedAt || currentQuestion(attempt)?.id !== action.questionId) return state;
      const question = currentQuestion(attempt)!;
      if (!/[\p{L}\p{N}]/u.test(action.record.answer)
        || (action.record.source === 'speech' && action.record.recognitionId
          && question.answers.some(answer => answer.recognitionId === action.record.recognitionId))) return state;
      const questions = attempt.questions.map(question => question.id === action.questionId
        ? { ...question, answers: [...question.answers, action.record] } : question);
      const completedAt = questions.every(isSolved) ? action.record.at : null;
      return { ...state, attempts: { ...state.attempts, [attempt.id]: { ...attempt, questions, completedAt } } };
    }
    case 'reveal': {
      const attempt = state.attempts[action.attemptId];
      const question = attempt && currentQuestion(attempt);
      if (!attempt || attempt.completedAt || question?.id !== action.questionId || !hasHint(question)) return state;
      const questions = attempt.questions.map(item => item.id === action.questionId ? { ...item, revealedAt: action.at } : item);
      return { ...state, attempts: { ...state.attempts, [attempt.id]: {
        ...attempt, questions, completedAt: questions.every(isSolved) ? action.at : null,
      } } };
    }
  }
}
export function recommendNext(scene: Scene, scenes: Scene[], state: LearningState): Scene | undefined {
  const candidates = scenes.filter(candidate => candidate.published && candidate.topicId === scene.topicId
    && candidate.id !== scene.id && candidate.image !== scene.image);
  const explicitNext = candidates.find(candidate => candidate.id === scene.nextSceneId);
  if (explicitNext) return explicitNext;
  const weak = weakVocabulary(state);
  return candidates.filter(candidate => (state.scenes[candidate.id]?.explored.length ?? 0) < candidate.vocabularyIds.length)
    .sort((a, b) => b.vocabularyIds.filter(id => weak.includes(id)).length - a.vocabularyIds.filter(id => weak.includes(id)).length)[0];
}

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
export interface LoadResult { state: LearningState; notice: string | null; writable: boolean }
export function loadState(catalog: Scene[], storage?: StoragePort): LoadResult {
  const fallback = emptyState();
  try {
    const target = storage ?? window.localStorage;
    const raw = target.getItem(STORAGE_KEY);
    const legacy = raw ? null : target.getItem(LEGACY_KEY);
    if (!raw && !legacy) return { state: fallback, notice: null, writable: true };
    const parsed: unknown = JSON.parse(raw ?? legacy!);
    if (!object(parsed)) throw new Error('Invalid storage');
    if (raw && parsed.schemaVersion !== SCHEMA_VERSION) {
      return { state: fallback, notice: 'This saved data uses a different version. It has been left untouched; this session will not overwrite it.', writable: false };
    }
    if (!object(parsed.scenes) || (raw && !object(parsed.attempts))) throw new Error('Invalid storage');
    let recovered = false;
    for (const [id, value] of Object.entries(parsed.scenes)) {
      const scene = catalog.find(item => item.id === id && item.published);
      if (!scene) continue;
      if (!object(value) || !strings(value.explored)) { recovered = true; continue; }
      const discoveredIds = legacy ? value.explored.map(word => LEGACY_VOCABULARY_IDS[word] ?? word) : value.explored;
      const explored = [...new Set(discoveredIds.filter(word => scene.vocabularyIds.includes(word)))];
      fallback.scenes[id] = { explored, lastVisited: finite(value.lastVisited) ? value.lastVisited : 0 };
    }
    if (raw && object(parsed.attempts)) {
      for (const [id, value] of Object.entries(parsed.attempts)) {
        const attempt = validateAttempt(id, value, catalog);
        if (attempt) fallback.attempts[id] = attempt;
        else recovered = true;
      }
    }
    return { state: fallback, writable: true, notice: legacy
      ? 'Your previous discoveries have been kept. Start a new challenge for an accurate score.'
      : recovered ? 'Some saved records could not be read. Your other progress has been kept.' : null };
  } catch {
    return { state: fallback, writable: true, notice: 'Saved progress could not be read. You can keep learning in this session.' };
  }
}
function validateAttempt(id: string, value: unknown, catalog: Scene[]): ChallengeAttempt | null {
  if (!object(value) || value.id !== id || typeof value.sceneId !== 'string' || !finite(value.createdAt)
    || (value.kind !== 'full' && value.kind !== 'weak') || !Array.isArray(value.questions)
    || !(value.completedAt === null || finite(value.completedAt))) return null;
  const scene = catalog.find(item => item.published && item.id === value.sceneId);
  if (!scene || !value.questions.length || value.questions.length > scene.vocabularyIds.length) return null;
  const seen = new Set<string>();
  const questionIds = new Set<string>();
  const questions: ChallengeQuestion[] = [];
  let encounteredUnsolved = false;
  for (const q of value.questions) {
    if (!object(q) || typeof q.id !== 'string' || questionIds.has(q.id) || typeof q.vocabularyId !== 'string'
      || !scene.vocabularyIds.includes(q.vocabularyId) || seen.has(q.vocabularyId)
      || (q.mode !== 'find' && q.mode !== 'produce') || !Array.isArray(q.answers)) return null;
    const answers: AnswerRecord[] = [];
    for (const a of q.answers) {
      if (!object(a) || typeof a.answer !== 'string' || typeof a.correct !== 'boolean' || !finite(a.at)
        || !['hotspot', 'typing', 'speech'].includes(String(a.source)) || answers.some(answer => answer.correct)) return null;
      if (a.recognitionId !== undefined && (typeof a.recognitionId !== 'string' || a.source !== 'speech'
        || answers.some(answer => answer.recognitionId === a.recognitionId))) return null;
      answers.push({ answer: a.answer, correct: a.correct, at: a.at, source: a.source as AnswerRecord['source'],
        ...(typeof a.recognitionId === 'string' ? { recognitionId: a.recognitionId } : {}) });
    }
    const question: ChallengeQuestion = { id: q.id, vocabularyId: q.vocabularyId, mode: q.mode, answers };
    if (q.revealedAt !== undefined) {
      if (!finite(q.revealedAt) || !hasHint(question) || answers.some(answer => answer.correct)) return null;
      question.revealedAt = q.revealedAt;
    }
    if (encounteredUnsolved && (answers.length || question.revealedAt !== undefined)) return null;
    if (!isSolved(question)) encounteredUnsolved = true;
    seen.add(q.vocabularyId);
    questionIds.add(q.id);
    questions.push(question);
  }
  if (value.kind === 'full' && seen.size !== scene.vocabularyIds.length) return null;
  if ((value.completedAt !== null) !== questions.every(isSolved)) return null;
  return { id, sceneId: value.sceneId, kind: value.kind, createdAt: value.createdAt, completedAt: value.completedAt, questions };
}
export function saveState(state: LearningState, storage?: StoragePort): boolean {
  try { (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
