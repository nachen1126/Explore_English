import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assembleScenes, categories, getCategoryScenes, getSceneCategory, scenes, topics, publishedScenes, vocabulary } from '../data';
import { hotspotStyle, normalizePoint } from '../scene-geometry';

describe('publication contract', () => {
  it('retains all independently authored scenes within a topic', () => {
    const first = publishedScenes[0];
    const second = { ...first, id: 'test-next', image: 'test-distinct.webp' };
    const result = assembleScenes([first, second], topics);
    expect(result.filter(scene => scene.topicId === first.topicId)).toEqual([first, second]);
  });
  it('groups existing and planned topics into bilingual categories without publishing drafts', () => {
    expect(categories).toHaveLength(8);
    expect(topics).toHaveLength(38);
    expect(topics.find(topic => topic.id === 'cafe')?.categoryId).toBe('food-dining');
    expect(topics.find(topic => topic.id === 'kitchen')?.categoryId).toBe('food-dining');
    expect(topics.find(topic => topic.id === 'gym')?.categoryId).toBe('sports-fitness');
    expect(categories.find(category => category.title === 'Café')).toBeUndefined();
    expect(categories.every(category => category.chineseTitle.length > 0)).toBe(true);
    expect(new Set(topics.map(topic => topic.id)).size).toBe(topics.length);
    expect(getCategoryScenes('sports-fitness').map(scene => scene.id)).toEqual(['gym-1']);
    expect(getCategoryScenes('food-dining').map(scene => scene.id).sort()).toEqual(['kitchen-1', 'supermarket-1']);
    expect(getCategoryScenes('beauty-personal-care')).toEqual([]);
    expect(getCategoryScenes('animals')).toEqual([]);
    expect(getCategoryScenes('unknown')).toEqual([]);
    expect(publishedScenes).toHaveLength(4);
    publishedScenes.forEach(scene => expect(getSceneCategory(scene)).toBeDefined());
  });
  it('publishes only complete independent scene records and real optimised assets', () => {
    const hashes = new Set();
    publishedScenes.forEach(scene => {
      expect(scene.vocabularyIds).toHaveLength(10);
      expect(new Set(scene.vocabularyIds).size).toBe(10);
      expect(scene.hotspots.map(hotspot => hotspot.vocabularyId).sort()).toEqual([...scene.vocabularyIds].sort());
      expect(scene.nextSceneId).not.toBe(scene.id);
      for (const path of [scene.image, scene.thumbnail]) {
        expect(path).toMatch(/\.(webp|avif)$/);
        expect(statSync('public/' + path).size).toBeLessThanOrEqual(500_000);
      }
      hashes.add(createHash('sha256').update(readFileSync('public/' + scene.image)).digest('hex'));
      if (scene.assetStatus === 'final') expect([scene.imageWidth, scene.imageHeight]).toEqual([1536, 1024]);
      else expect(scene.assetStatus).toBe('development');
    });
    expect(hashes.size).toBe(publishedScenes.length);
    expect(new Set(scenes.map(scene => scene.id)).size).toBe(scenes.length);
  });
  it('14. every displayed IPA has a source and is never a word wrapped in slashes', () => {
    publishedScenes.flatMap(scene => scene.vocabularyIds).forEach(id => {
      const item = vocabulary[id];
      expect(item.word.length).toBeGreaterThan(0);
      expect(item.chineseMeaning.length).toBeGreaterThan(0);
      expect(item.exampleSentence.length).toBeGreaterThan(10);
      if (item.britishIPA) {
        expect(item.britishIPA).not.toBe(`/${item.word}/`);
        expect(item.ipaSource).toMatch(/^https:\/\/dictionary.cambridge.org\//);
      }
    });
  });
});
describe('intrinsic image coordinates', () => {
  it('11. positions every hotspot as a percentage of the same intrinsic-ratio box at desktop, tablet and phone widths', () => {
    publishedScenes.forEach(scene => scene.hotspots.forEach(hotspot => {
      expect(hotspot.x).toBeGreaterThanOrEqual(0);
      expect(hotspot.y).toBeGreaterThanOrEqual(0);
      expect(hotspot.x + hotspot.width).toBeLessThanOrEqual(1.00001);
      expect(hotspot.y + hotspot.height).toBeLessThanOrEqual(1.00001);
      for (const width of [320, 390, 768, 1280]) {
        const height = width * scene.imageHeight / scene.imageWidth;
        const style = hotspotStyle(hotspot);
        const pixelX = parseFloat(style.left) / 100 * width;
        const pixelY = parseFloat(style.top) / 100 * height;
        expect(normalizePoint(pixelX, pixelY, { left: 0, top: 0, width, height })).toEqual({ x: expect.closeTo(hotspot.x), y: expect.closeTo(hotspot.y) });
      }
    }));
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('object-fit:contain');
    expect(css).not.toMatch(/object-fit\s*:\s*cover/);
    expect(css).not.toMatch(/aspect-ratio\s*:\s*4\s*\/\s*3/);
  });
});
