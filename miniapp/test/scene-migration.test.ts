import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createChallenge, discoverVocabulary, emptyLearningSnapshot, mergeLearningSnapshots,
  recordChallengeAnswer, scaleHotspot, summarizeChallenge,
} from '@shared';
import {
  miniappCategories, miniappSceneById, miniappScenes, miniappVocabularyById, scenesForCategory,
} from '../src/data/catalog';
import { sceneMarkerBox } from '../src/services/hotspot-marker';

const expectedSceneIds = [
  'swimming-pool-1', 'skin-care-1', 'kitchen-2', 'supermarket-2', 'cafe-1', 'underwater-1',
  'living-room-1', 'bathroom-1', 'laundry-room-1', 'airport-2', 'hotel-room-1',
  'train-station-1', 'classroom-1',
];

describe('published web scene migration catalog', () => {
  it('preserves all seven published-category and thirteen published-scene orders', () => {
    expect(miniappCategories.map(category => category.id)).toEqual([
      'sports-fitness', 'beauty-personal-care', 'food-dining', 'animals',
      'home-living', 'travel-transport', 'study-work',
    ]);
    expect(miniappScenes.map(scene => scene.id)).toEqual(expectedSceneIds);
    expect(miniappScenes.every(scene => scene.published)).toBe(true);
  });

  it.each(miniappScenes)('$id contains ten complete vocabulary records and calibrated hotspot regions', scene => {
    expect(scene.vocabularyIds).toHaveLength(10);
    expect(new Set(scene.vocabularyIds).size).toBe(10);
    expect(scene.imageWidth).toBeGreaterThan(0);
    expect(scene.imageHeight).toBeGreaterThan(0);
    for (const vocabularyId of scene.vocabularyIds) {
      const item = miniappVocabularyById[vocabularyId];
      expect(item).toBeTruthy();
      expect(item.word).toBeTruthy();
      expect(item.partOfSpeech).toBeTruthy();
      expect(item.britishIPA).toBeTruthy();
      expect(item.chineseMeaning).toBeTruthy();
      expect(item.exampleSentence).toBeTruthy();
      expect(item.acceptedAnswers.length).toBeGreaterThan(0);
      expect(item.audioText).toBeTruthy();
      expect(scene.hotspots.some(hotspot => hotspot.vocabularyId === vocabularyId)).toBe(true);
    }
    expect(scene.hotspots.every(hotspot => scene.vocabularyIds.includes(hotspot.vocabularyId))).toBe(true);
  });

  it('keeps every permanent vocabulary ID within exactly one scene', () => {
    const owners = new Map<string, string>();
    for (const scene of miniappScenes) for (const id of scene.vocabularyIds) {
      expect(owners.has(id)).toBe(false);
      owners.set(id, scene.id);
    }
    expect(owners.size).toBe(130);
  });

  it('ships distinct prepared full images and thumbnails for every scene', () => {
    expect(new Set(miniappScenes.map(scene => scene.image)).size).toBe(miniappScenes.length);
    expect(new Set(miniappScenes.map(scene => scene.thumbnail)).size).toBe(miniappScenes.length);
    for (const scene of miniappScenes) {
      expect(fs.existsSync(path.resolve(__dirname, '../assets', scene.image))).toBe(true);
      expect(fs.existsSync(path.resolve(__dirname, '../assets', scene.thumbnail))).toBe(true);
    }
  });

  it('keeps every hotspot and its marker inside the same image at four representative display sizes', () => {
    const viewports = [
      [320, 320 * 2 / 3], [430, 430 * 2 / 3], [412, 412 * 2 / 3], [768, 768 * 2 / 3],
    ];
    for (const scene of miniappScenes) {
      const selectedMarkers = new Map<string, typeof scene.hotspots[number]>();
      for (const hotspot of scene.hotspots) {
        const current = selectedMarkers.get(hotspot.vocabularyId);
        if (!current || hotspot.width * hotspot.height > current.width * current.height) {
          selectedMarkers.set(hotspot.vocabularyId, hotspot);
        }
      }
      for (const hotspot of scene.hotspots) {
      expect(hotspot.x).toBeGreaterThanOrEqual(0);
      expect(hotspot.y).toBeGreaterThanOrEqual(0);
      expect(hotspot.x + hotspot.width).toBeLessThanOrEqual(1);
      expect(hotspot.y + hotspot.height).toBeLessThanOrEqual(1);
      }
      for (const hotspot of selectedMarkers.values()) for (const [width, height] of viewports) {
        const box = scaleHotspot(hotspot, width, height);
        const marker = sceneMarkerBox(scene, hotspot, width, width <= 430 ? 18 : 24);
        expect(marker.x).toBeGreaterThanOrEqual(box.x);
        expect(marker.y).toBeGreaterThanOrEqual(box.y);
        expect(marker.x + marker.width).toBeLessThanOrEqual(box.x + box.width);
        expect(marker.y + marker.height).toBeLessThanOrEqual(box.y + box.height);
      }
    }
  });

  it('exposes every migrated scene through its correct category without pagination', () => {
    for (const category of miniappCategories) {
      const ids = scenesForCategory(category.id).map(scene => scene.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toEqual(miniappScenes.filter(scene => scene.categoryId === category.id).map(scene => scene.id));
    }
  });
});

describe('multi-scene learning and challenge isolation', () => {
  it('keeps progress isolated by scene and preserves the existing kitchen-2 key', () => {
    const kitchen = miniappSceneById['kitchen-2'];
    const airport = miniappSceneById['airport-2'];
    let snapshot = emptyLearningSnapshot();
    snapshot = discoverVocabulary(snapshot, kitchen, kitchen.vocabularyIds[0], 1);
    snapshot = discoverVocabulary(snapshot, airport, airport.vocabularyIds[0], 2);
    expect(snapshot.progress['kitchen-2'].discoveredVocabularyIds).toEqual([kitchen.vocabularyIds[0]]);
    expect(snapshot.progress['airport-2'].discoveredVocabularyIds).toEqual([airport.vocabularyIds[0]]);
    expect(snapshot.progress['kitchen-2'].discoveredVocabularyIds).not.toContain(airport.vocabularyIds[0]);
  });

  it.each(miniappScenes)('$id can complete exploration and challenge all ten words', scene => {
    let snapshot = emptyLearningSnapshot();
    scene.vocabularyIds.forEach((id, index) => { snapshot = discoverVocabulary(snapshot, scene, id, index + 1); });
    expect(snapshot.progress[scene.id].completed).toBe(true);
    let attempt = createChallenge(scene, `${scene.id}-attempt`, 1, () => 0.999999);
    expect(new Set(attempt.questions.map(question => question.vocabularyId))).toEqual(new Set(scene.vocabularyIds));
    for (const question of attempt.questions) attempt = recordChallengeAnswer(attempt, question.id, {
      answer: question.vocabularyId, correct: true, at: 2, source: question.mode === 'find' ? 'hotspot' : 'typing',
    });
    expect(summarizeChallenge(attempt)).toMatchObject({ score: 10, total: 10, accuracy: 100 });
  });

  it('merges old local Kitchen progress without empty cloud data overwriting it', () => {
    const kitchen = miniappSceneById['kitchen-2'];
    const local = discoverVocabulary(emptyLearningSnapshot(), kitchen, kitchen.vocabularyIds[0], 10);
    const merged = mergeLearningSnapshots(local, emptyLearningSnapshot(), miniappScenes);
    expect(merged.progress['kitchen-2'].discoveredVocabularyIds).toEqual([kitchen.vocabularyIds[0]]);
  });

  it('never restores a first-answer point after a wrong retry in any scene', () => {
    for (const scene of miniappScenes) {
      let attempt = createChallenge(scene, `score-${scene.id}`, 1, () => 0.999999);
      const first = attempt.questions[0];
      attempt = recordChallengeAnswer(attempt, first.id, { answer: 'wrong', correct: false, at: 2, source: 'typing' });
      attempt = recordChallengeAnswer(attempt, first.id, { answer: first.vocabularyId, correct: true, at: 3, source: 'typing' });
      for (const question of attempt.questions.slice(1)) attempt = recordChallengeAnswer(attempt, question.id, {
        answer: question.vocabularyId, correct: true, at: 4, source: question.mode === 'find' ? 'hotspot' : 'typing',
      });
      expect(summarizeChallenge(attempt).score).toBe(9);
    }
  });
});
