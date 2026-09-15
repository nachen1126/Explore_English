import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChallenge, discoverVocabulary, emptyLearningSnapshot, kitchenScene, recordChallengeAnswer, saveAttempt } from '@shared';

vi.mock('@tarojs/taro', () => ({ default: {} }));
import { GUEST_STORAGE_KEY, PRIVATE_STORAGE_KEY, clearPrivateStorage, readSnapshot, writeSnapshot, type StoragePort } from '../src/services/storage';

describe('mini-program storage', () => {
  let values: Map<string, unknown>;
  let storage: StoragePort;
  beforeEach(() => {
    values = new Map();
    storage = { get: key => values.get(key), set: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
  });
  it('restores guest progress after reopening', () => {
    const saved = discoverVocabulary(emptyLearningSnapshot(), kitchenScene, 'kitchen-fridge', 1);
    expect(writeSnapshot(GUEST_STORAGE_KEY, saved, storage)).toBe(true);
    expect(readSnapshot(GUEST_STORAGE_KEY, storage)).toEqual(saved);
  });
  it('restores a completed challenge result after reopening', () => {
    let attempt = createChallenge(kitchenScene, 'persisted-attempt', 1, () => 0.999);
    for (const question of attempt.questions) attempt = recordChallengeAnswer(attempt, question.id,
      { answer: question.vocabularyId, correct: true, at: 2, source: 'hotspot' });
    const saved = saveAttempt(emptyLearningSnapshot(), attempt);
    writeSnapshot(GUEST_STORAGE_KEY, saved, storage);
    expect(readSnapshot(GUEST_STORAGE_KEY, storage).attempts['persisted-attempt'].completedAt).toBe(2);
  });
  it('keeps malformed storage from destroying the session', () => {
    values.set(GUEST_STORAGE_KEY, { schemaVersion: 99 });
    expect(readSnapshot(GUEST_STORAGE_KEY, storage)).toEqual(emptyLearningSnapshot());
  });
  it('clears only private account data on logout', () => {
    values.set(GUEST_STORAGE_KEY, { guest: true }); values.set(PRIVATE_STORAGE_KEY, { private: true });
    clearPrivateStorage(storage);
    expect(values.has(PRIVATE_STORAGE_KEY)).toBe(false);
    expect(values.has(GUEST_STORAGE_KEY)).toBe(true);
  });
  it('preserves local progress when a simulated network write fails', () => {
    const failing: StoragePort = { ...storage, set: () => { throw new Error('offline'); } };
    const snapshot = discoverVocabulary(emptyLearningSnapshot(), kitchenScene, 'kitchen-pan', 4);
    expect(writeSnapshot(GUEST_STORAGE_KEY, snapshot, failing)).toBe(false);
    expect(snapshot.progress[kitchenScene.id].discoveredVocabularyIds).toEqual(['kitchen-pan']);
  });
});
