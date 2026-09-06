import { describe, expect, it } from 'vitest';
import { scenes, publishedScenes, vocabulary } from '../data';
import { createAttempt, currentQuestion, emptyState, hasHint, isSolved, learningReducer, LEGACY_KEY, loadState, matches, recommendNext, saveState, STORAGE_KEY, summarize, weakVocabulary } from '../logic';
import type { LearningState } from '../types';

const scene = publishedScenes[0];
function completedWithMistake(): LearningState {
  const attempt = createAttempt(scene, [], 'full', () => 0.7);
  let state = learningReducer(emptyState(), { type: 'start', attempt });
  attempt.questions.forEach((question, index) => {
    if (index === 0) state = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer: 'wrong', correct: false, at: 2, source: 'typing' } });
    state = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer: vocabulary[question.vocabularyId].word, correct: true, at: 3 + index, source: 'typing' } });
  });
  return state;
}
describe('durable discovery', () => {
  it('migrates renamed versions of the same object without losing its discovery', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ scenes: { 'airport-1': { explored: ['airport-bottle', 'airport-bag'] } } }));
    expect(loadState(scenes).state.scenes['airport-1'].explored).toEqual(['airport-water-bottle', 'airport-travel-bag']);
  });
  it('1. re-entering a scene never clears discoveries', () => {
    let state = learningReducer(emptyState(), { type: 'discover', sceneId: scene.id, vocabularyId: scene.vocabularyIds[0], at: 1 });
    state = learningReducer(state, { type: 'visit', sceneId: scene.id, at: 2 });
    expect(state.scenes[scene.id].explored).toEqual([scene.vocabularyIds[0]]);
  });
  it('2. discovery survives a fresh storage load and is deduplicated', () => {
    let state = emptyState();
    for (let i = 0; i < 2; i++) state = learningReducer(state, { type: 'discover', sceneId: scene.id, vocabularyId: scene.vocabularyIds[0], at: i });
    expect(saveState(state)).toBe(true);
    expect(loadState(scenes).state.scenes[scene.id].explored).toEqual([scene.vocabularyIds[0]]);
  });
  it('keeps usable legacy discoveries without importing unreliable scores', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ words: {}, scenes: { [scene.id]: { explored: [scene.vocabularyIds[0]], challengeScore: 100 } } }));
    const loaded = loadState(scenes);
    expect(loaded.state.scenes[scene.id].explored).toHaveLength(1);
    expect(loaded.state.attempts).toEqual({});
    expect(loaded.notice).toContain('previous discoveries');
  });
});
describe('fixed questions and first answers', () => {
  it('4. every scene tests all ten unique words with five Find and five Produce questions', () => {
    publishedScenes.forEach(item => {
      const attempt = createAttempt(item);
      expect(attempt.questions).toHaveLength(10);
      expect(new Set(attempt.questions.map(question => question.vocabularyId))).toEqual(new Set(item.vocabularyIds));
      expect(attempt.questions.filter(question => question.mode === 'find')).toHaveLength(5);
      expect(attempt.questions.filter(question => question.mode === 'produce')).toHaveLength(5);
    });
  });
  it('5–6. a wrong first answer followed by success never regains the point', () => {
    const attempt = Object.values(completedWithMistake().attempts)[0];
    expect(summarize(attempt)).toMatchObject({ score: 9, total: 10, accuracy: 90 });
    expect(attempt.questions[0].answers.map(answer => answer.correct)).toEqual([false, true]);
    expect(summarize(attempt).remembered).toHaveLength(9);
  });
  it('ignores stale, double-submitted and out-of-order events', () => {
    const attempt = createAttempt(scene);
    let state = learningReducer(emptyState(), { type: 'start', attempt });
    const record = { answer: 'correct', correct: true, at: 1, source: 'typing' as const };
    expect(learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: attempt.questions[1].id, record })).toBe(state);
    state = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: attempt.questions[0].id, record });
    expect(learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: attempt.questions[0].id, record })).toBe(state);
    expect(currentQuestion(state.attempts[attempt.id])?.id).toBe(attempt.questions[1].id);
  });
  it('7–8. complete answer history and exact weak words survive result reload', () => {
    const state = completedWithMistake();
    saveState(state);
    const attempt = Object.values(loadState(scenes).state.attempts)[0];
    expect(attempt).toEqual(Object.values(state.attempts)[0]);
    expect(summarize(attempt).weak).toEqual([attempt.questions[0].vocabularyId]);
    expect(weakVocabulary(state)).toEqual([attempt.questions[0].vocabularyId]);
  });
  it('freezes question order across visits, persistence and updates', () => {
    const attempt = createAttempt(scene);
    const state = learningReducer(emptyState(), { type: 'start', attempt });
    saveState(learningReducer(state, { type: 'visit', sceneId: scene.id, at: 2 }));
    expect(Object.values(loadState(scenes).state.attempts)[0].questions).toEqual(attempt.questions);
  });
  it('prioritises weak words and limits weak practice to the exact failed set', () => {
    const weak = [scene.vocabularyIds[9], scene.vocabularyIds[8]];
    const full = createAttempt(scene, weak);
    expect(full.questions.slice(0, 2).map(q => q.vocabularyId).sort()).toEqual([...weak].sort());
    expect(createAttempt(scene, weak, 'weak').questions).toHaveLength(2);
  });
  it('a later successful first answer clears future practice priority but never rewrites an older result', () => {
    const state = completedWithMistake();
    const old = Object.values(state.attempts)[0];
    const weak = summarize(old).weak;
    const fresh = createAttempt(scene, weak, 'weak');
    let next = learningReducer(state, { type: 'start', attempt: fresh });
    next = learningReducer(next, { type: 'answer', attemptId: fresh.id, questionId: fresh.questions[0].id,
      record: { answer: 'correct', correct: true, at: 999, source: 'typing' } });
    expect(weakVocabulary(next)).toEqual([]);
    expect(summarize(next.attempts[old.id]).score).toBe(9);
  });
});
describe('answer matching', () => {
  it.each([
    ['  IT’S A BOTTLE!!! ', 'kitchen-bottle'],
    ['The WATER   BOTTLES.', 'airport-water-bottle'],
    ['tomatoes', 'supermarket-tomato'],
    ['an airplane', 'airport-aeroplane'],
    ['the dumbbells', 'gym-dumbbell'],
    ['weight benches', 'gym-weight-bench'],
  ])('accepts %s', (answer, id) => expect(matches(answer, vocabulary[id])).toBe(true));
  it('rejects empty and unrelated answers instead of fuzzy guessing', () => {
    expect(matches('!!!', vocabulary['kitchen-bottle'])).toBe(false);
    expect(matches('bottleneck', vocabulary['kitchen-bottle'])).toBe(false);
    expect(matches('the chair', vocabulary['kitchen-table'])).toBe(false);
  });
});
describe('safe continuation', () => {
  it('9. excludes the current scene, other topics, unpublished and duplicate pictures', () => {
    const duplicate = { ...scene, id: 'duplicate', nextSceneId: null };
    const unpublished = { ...scene, id: 'draft', image: 'different.webp', published: false };
    expect(recommendNext(scene, [scene, duplicate, unpublished, publishedScenes[1]], emptyState())).toBeUndefined();
  });
  it('chooses the explicit real next scene in the same topic', () => {
    const next = { ...scene, id: 'test-next', image: 'distinct-test-only.webp' };
    expect(recommendNext({ ...scene, nextSceneId: next.id }, [scene, next], emptyState())?.id).toBe(next.id);
  });
  it('10. returns an explicit no-next state when a topic has one real picture', () => {
    expect(recommendNext(scene, scenes, emptyState())).toBeUndefined();
  });
});
describe('storage validation', () => {
  it('preserves a pre-category v2 attempt and discoveries without needing a category migration', () => {
    const attempt = createAttempt(scene);
    const state = { ...emptyState(), scenes: { [scene.id]: { explored: [scene.vocabularyIds[0]], lastVisited: 1 } }, attempts: { [attempt.id]: attempt } };
    saveState(state);
    expect(loadState(scenes).state).toEqual(state);
    expect(loadState(scenes).notice).toBeNull();
  });
  it('persists assisted completion and cannot turn a revealed answer into mastery', () => {
    const attempt = createAttempt(scene, [scene.vocabularyIds[0]], 'weak');
    attempt.questions[0].mode = 'produce';
    const q = attempt.questions[0];
    let state = learningReducer(emptyState(), { type: 'start', attempt });
    expect(learningReducer(state, { type: 'reveal', attemptId: attempt.id, questionId: q.id, at: 1 })).toBe(state);
    for (let i = 0; i < 3; i++) state = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: q.id,
      record: { answer: 'wrong', correct: false, at: i + 1, source: i === 1 ? 'speech' : 'typing', ...(i === 1 ? { recognitionId: 'recording-1' } : {}) } });
    expect(hasHint(state.attempts[attempt.id].questions[0])).toBe(true);
    state = learningReducer(state, { type: 'reveal', attemptId: attempt.id, questionId: q.id, at: 4 });
    expect(isSolved(state.attempts[attempt.id].questions[0])).toBe(true);
    expect(state.attempts[attempt.id].completedAt).toBe(4);
    const lateCorrect = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: q.id,
      record: { answer: vocabulary[q.vocabularyId].word, correct: true, at: 5, source: 'typing' } });
    expect(lateCorrect).toBe(state);
    saveState(state);
    expect(loadState(scenes).state).toEqual(state);
    expect(summarize(loadState(scenes).state.attempts[attempt.id])).toMatchObject({ score: 0, remembered: [], weak: [q.vocabularyId] });
    expect(weakVocabulary(loadState(scenes).state)).toEqual([q.vocabularyId]);
  });
  it('ignores blank text and duplicate speech IDs at the shared reducer boundary', () => {
    const attempt = createAttempt(scene, [scene.vocabularyIds[0]], 'weak');
    attempt.questions[0].mode = 'produce';
    const questionId = attempt.questions[0].id;
    let state = learningReducer(emptyState(), { type: 'start', attempt });
    for (const answer of ['', '  ', '!!!']) expect(learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId,
      record: { answer, correct: false, source: 'typing', at: 1 } })).toBe(state);
    const record = { answer: 'wrong', correct: false, source: 'speech' as const, recognitionId: 'same-final', at: 1 };
    state = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId, record });
    expect(learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId, record })).toBe(state);
    expect(state.attempts[attempt.id].questions[0].answers).toHaveLength(1);
  });
  it('rejects a corrupt reveal without the three required errors', () => {
    const attempt = createAttempt(scene, [scene.vocabularyIds[0]], 'weak');
    attempt.questions[0].mode = 'produce';
    attempt.questions[0].revealedAt = 3;
    attempt.completedAt = 3;
    saveState({ ...emptyState(), attempts: { [attempt.id]: attempt } });
    expect(loadState(scenes).state.attempts).toEqual({});
  });
  it.each(['null', '[]', '"text"', '{broken', '{"schemaVersion":2,"scenes":null,"attempts":{}}'])('12. invalid payload %s safely recovers', payload => {
    localStorage.setItem(STORAGE_KEY, payload);
    expect(loadState(scenes).state).toEqual(emptyState());
  });
  it('filters malformed scene records and keeps healthy records', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 2, scenes: { [scene.id]: { explored: [scene.vocabularyIds[0], 'unknown'] }, [publishedScenes[1].id]: 7 }, attempts: { invalid: { score: 900 } } }));
    const loaded = loadState(scenes);
    expect(loaded.state.scenes[scene.id].explored).toEqual([scene.vocabularyIds[0]]);
    expect(loaded.state.attempts).toEqual({});
    expect(loaded.notice).toBeTruthy();
  });
  it('does not overwrite data from an unknown future schema', () => {
    localStorage.setItem(STORAGE_KEY, '{"schemaVersion":99,"scenes":{},"attempts":{}}');
    expect(loadState(scenes).writable).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('99');
  });
  it('recovers from read and write access failures', () => {
    const brokenStorage = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Quota'); } };
    expect(loadState(scenes, brokenStorage).state).toEqual(emptyState());
    expect(saveState(emptyState(), brokenStorage)).toBe(false);
  });
});
