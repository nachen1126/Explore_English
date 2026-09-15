import { describe, expect, it } from 'vitest';
import {
  createChallenge, discoverVocabulary, emptyLearningSnapshot, hasChallengeHint, hotspotStyle, isQuestionSolved,
  kitchenScene, kitchenVocabulary, markerBox, matchesAnswer, mergeLearningSnapshots, recordChallengeAnswer,
  revealChallengeAnswer, saveAttempt, scaleHotspot, summarizeChallenge, weakVocabularyIds,
} from '@shared';

const deterministicAttempt = () => createChallenge(kitchenScene, 'attempt-1', 100, () => 0.999999);

describe('Kitchen mini-program shared content', () => {
  it('loads the canonical ten Kitchen words', () => {
    expect(kitchenVocabulary).toHaveLength(10);
    expect(kitchenScene.vocabularyIds).toEqual(kitchenVocabulary.map(item => item.id));
  });
  it('binds every hotspot to one of exactly ten vocabulary IDs', () => {
    const ids = new Set(kitchenScene.hotspots.map(hotspot => hotspot.vocabularyId));
    expect(ids).toEqual(new Set(kitchenScene.vocabularyIds));
    expect(kitchenScene.hotspots.every(hotspot => kitchenScene.vocabularyIds.includes(hotspot.vocabularyId))).toBe(true);
  });
  it('keeps normalized hotspot positions proportional after image scaling', () => {
    for (const hotspot of kitchenScene.hotspots) {
      const desktop = scaleHotspot(hotspot, 900, 600);
      const phone = scaleHotspot(hotspot, 360, 240);
      expect(phone.x / desktop.x || 0.4).toBeCloseTo(0.4, 8);
      expect(phone.y / desktop.y || 0.4).toBeCloseTo(0.4, 8);
      expect(phone.width / desktop.width).toBeCloseTo(0.4, 8);
      expect(phone.height / desktop.height).toBeCloseTo(0.4, 8);
      expect(hotspotStyle(hotspot).left).toBe(`${hotspot.x * 100}%`);
    }
  });
  it('keeps the marker box inside each hotspot at desktop and phone sizes', () => {
    for (const hotspot of kitchenScene.hotspots) for (const [width, height, max] of [[900, 600, 24], [360, 240, 18]]) {
      const region = scaleHotspot(hotspot, width, height);
      const marker = markerBox(hotspot, width, height, max);
      expect(marker.x).toBeGreaterThanOrEqual(region.x);
      expect(marker.y).toBeGreaterThanOrEqual(region.y);
      expect(marker.x + marker.width).toBeLessThanOrEqual(region.x + region.width);
      expect(marker.y + marker.height).toBeLessThanOrEqual(region.y + region.height);
    }
  });
  it('fits the circular 18rpx marker inside every Kitchen hotspot at the 686rpx content width', () => {
    for (const hotspot of kitchenScene.hotspots) {
      const region = scaleHotspot(hotspot, 686, 686 * 2 / 3);
      expect(region.width).toBeGreaterThanOrEqual(20);
      expect(region.height).toBeGreaterThanOrEqual(20);
    }
  });
  it('matches the real answer aliases', () => {
    expect(matchesAnswer('a refrigerator', kitchenVocabulary[0])).toBe(true);
    expect(matchesAnswer('cupboard', kitchenVocabulary[7])).toBe(true);
  });
});

describe('first-answer scoring and persistence data', () => {
  it('does not restore a point after a wrong first answer and correct retry', () => {
    let attempt = deterministicAttempt();
    const first = attempt.questions[0];
    attempt = recordChallengeAnswer(attempt, first.id, { answer: 'wrong', correct: false, at: 101, source: 'typing' });
    attempt = recordChallengeAnswer(attempt, first.id, { answer: 'fridge', correct: true, at: 102, source: 'typing' });
    for (const question of attempt.questions.slice(1)) attempt = recordChallengeAnswer(attempt, question.id,
      { answer: question.vocabularyId, correct: true, at: 103, source: 'hotspot' });
    expect(summarizeChallenge(attempt).score).toBe(9);
    expect(summarizeChallenge(attempt).needsPractice).toContain(first.vocabularyId);
  });
  it('ignores duplicate speech recognition IDs', () => {
    let attempt = deterministicAttempt(); const question = attempt.questions[0];
    attempt = recordChallengeAnswer(attempt, question.id, { answer: 'wrong', correct: false, at: 1, source: 'speech', recognitionId: 'same' });
    const repeated = recordChallengeAnswer(attempt, question.id, { answer: 'right', correct: true, at: 2, source: 'speech', recognitionId: 'same' });
    expect(repeated.questions[0].answers).toHaveLength(1);
  });
  it('unlocks a persisted hint after three wrong answers and still requires a correct answer after reveal', () => {
    let attempt = deterministicAttempt();
    for (const findQuestion of attempt.questions.filter(value => value.mode === 'find')) {
      attempt = recordChallengeAnswer(attempt, findQuestion.id,
        { answer: findQuestion.vocabularyId, correct: true, at: 1, source: 'hotspot' });
    }
    const question = attempt.questions.find(value => value.mode === 'produce')!;
    for (let index = 0; index < 3; index += 1) attempt = recordChallengeAnswer(attempt, question.id,
      { answer: `wrong-${index}`, correct: false, at: index + 1, source: 'typing' });
    expect(hasChallengeHint(attempt.questions.find(value => value.id === question.id)!)).toBe(true);
    attempt = revealChallengeAnswer(attempt, question.id, 5);
    const revealed = attempt.questions.find(value => value.id === question.id)!;
    expect(revealed.revealedAt).toBe(5);
    expect(isQuestionSolved(revealed)).toBe(false);
    const correctAnswer = kitchenVocabulary.find(value => value.id === question.vocabularyId)!.word;
    attempt = recordChallengeAnswer(attempt, question.id, { answer: correctAnswer, correct: true, at: 6, source: 'typing' });
    expect(isQuestionSolved(attempt.questions.find(value => value.id === question.id)!)).toBe(true);
    expect(summarizeChallenge(attempt).needsPractice).toContain(question.vocabularyId);
  });
  it('creates a real weak-word challenge using only selected vocabulary IDs', () => {
    const attempt = createChallenge(kitchenScene, 'weak-1', 1, () => 0.999, 'weak', ['kitchen-oven', 'kitchen-pan']);
    expect(attempt.kind).toBe('weak');
    expect(attempt.questions.map(question => question.vocabularyId)).toEqual(['kitchen-oven', 'kitchen-pan']);
  });
  it('finds the latest weak vocabulary and keeps the more advanced duplicate attempt during merge', () => {
    const base = deterministicAttempt(); const question = base.questions[0];
    const advanced = recordChallengeAnswer(base, question.id, { answer: 'wrong', correct: false, at: 10, source: 'typing' });
    expect(weakVocabularyIds([advanced])).toContain(question.vocabularyId);
    const cloud = saveAttempt(emptyLearningSnapshot(), base);
    const local = saveAttempt(emptyLearningSnapshot(), advanced);
    const merged = mergeLearningSnapshots(local, cloud, [kitchenScene]);
    expect(merged.attempts[base.attemptId].questions[0].answers).toHaveLength(1);
  });
  it('does not count no-speech or network failures as an answer', () => {
    const attempt = deterministicAttempt();
    expect(recordChallengeAnswer(attempt, attempt.questions[0].id, { answer: '', correct: false, at: 1, source: 'speech' })).toBe(attempt);
  });
  it('saves discovered vocabulary without losing earlier discoveries', () => {
    let snapshot = emptyLearningSnapshot();
    snapshot = discoverVocabulary(snapshot, kitchenScene, 'kitchen-fridge', 1);
    snapshot = discoverVocabulary(snapshot, kitchenScene, 'kitchen-sink', 2);
    expect(snapshot.progress[kitchenScene.id].discoveredVocabularyIds).toEqual(['kitchen-fridge', 'kitchen-sink']);
  });
  it('merges local and cloud discovery sets without empty overwrite', () => {
    const local = discoverVocabulary(emptyLearningSnapshot(), kitchenScene, 'kitchen-fridge', 10);
    const cloud = discoverVocabulary(emptyLearningSnapshot(), kitchenScene, 'kitchen-sink', 20);
    const merged = mergeLearningSnapshots(local, cloud, [kitchenScene]);
    expect(new Set(merged.progress[kitchenScene.id].discoveredVocabularyIds)).toEqual(new Set(['kitchen-fridge', 'kitchen-sink']));
    expect(merged.progress[kitchenScene.id].updatedAt).toBe(20);
  });
  it('deduplicates challenge attempts by attemptId during merge', () => {
    const attempt = deterministicAttempt();
    const local = saveAttempt(emptyLearningSnapshot(), attempt);
    const cloud = saveAttempt(emptyLearningSnapshot(), { ...attempt });
    expect(Object.keys(mergeLearningSnapshots(local, cloud, [kitchenScene]).attempts)).toEqual(['attempt-1']);
  });
});
