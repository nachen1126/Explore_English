import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assembleScenes, categories, getCategoryScenes, getSceneCategory, scenes, topics, publishedScenes, vocabulary } from '../data';
import { hotspotDebugEnabled, hotspotOutOfBounds, hotspotStyle, imageDisplayMetrics, normalizePoint } from '../scene-geometry';

describe('publication contract', () => {
  it('retains all independently authored scenes within a topic', () => {
    const first = publishedScenes[0];
    const second = { ...first, id: 'test-next', image: 'test-distinct.webp' };
    const result = assembleScenes([first, second], topics);
    expect(result.filter(scene => scene.topicId === first.topicId)).toEqual([first, second]);
  });
  it('groups existing and planned topics into bilingual categories without publishing drafts', () => {
    expect(categories).toHaveLength(8);
    expect(topics).toHaveLength(43);
    expect(topics.find(topic => topic.id === 'cafe')?.categoryId).toBe('food-dining');
    expect(topics.find(topic => topic.id === 'kitchen')?.categoryId).toBe('food-dining');
    expect(topics.find(topic => topic.id === 'gym')?.categoryId).toBe('sports-fitness');
    expect(categories.find(category => category.title === 'Café')).toBeUndefined();
    expect(categories.every(category => category.chineseTitle.length > 0)).toBe(true);
    expect(new Set(topics.map(topic => topic.id)).size).toBe(topics.length);
    expect(getCategoryScenes('sports-fitness').map(scene => scene.id)).toEqual(['swimming-pool-1']);
    expect(getCategoryScenes('food-dining').map(scene => scene.id)).toEqual(['kitchen-2', 'supermarket-2', 'cafe-1']);
    expect(getCategoryScenes('travel-transport').map(scene => scene.id)).toEqual(['airport-2', 'hotel-room-1']);
    expect(getCategoryScenes('beauty-personal-care').map(scene => scene.id)).toEqual(['skin-care-1']);
    expect(getCategoryScenes('animals').map(scene => scene.id)).toEqual(['underwater-1']);
    expect(getCategoryScenes('home-living').map(scene => scene.id)).toEqual(['living-room-1', 'bathroom-1', 'laundry-room-1']);
    expect(getCategoryScenes('unknown')).toEqual([]);
    expect(publishedScenes).toHaveLength(11);
    publishedScenes.forEach(scene => expect(getSceneCategory(scene)).toBeDefined());
  });
  it('publishes only complete independent scene records and real optimised assets', () => {
    const hashes = new Set();
    publishedScenes.forEach(scene => {
      expect(scene.vocabularyIds).toHaveLength(10);
      expect(new Set(scene.vocabularyIds).size).toBe(10);
      expect([...new Set(scene.hotspots.map(hotspot => hotspot.vocabularyId))].sort()).toEqual([...scene.vocabularyIds].sort());
      expect(scene.nextSceneId).not.toBe(scene.id);
      for (const path of [scene.image, scene.thumbnail]) {
        expect(path).toMatch(/\.(webp|avif)$/);
        expect(statSync('public/' + path).size).toBeLessThanOrEqual(500_000);
      }
      hashes.add(createHash('sha256').update(readFileSync('public/' + scene.image)).digest('hex'));
      expect(scene.assetStatus).toBe('final');
      expect([scene.imageWidth, scene.imageHeight]).toEqual([1536, 1024]);
      expect(scene.imageVersion).toBe(scene.hotspotImageVersion);
      expect(scene.imageVersion).toMatch(/-v\d+$/);
    });
    expect(hashes.size).toBe(publishedScenes.length);
    expect(new Set(scenes.map(scene => scene.id)).size).toBe(scenes.length);
  });
  it('publishes the first expansion batch with independent scene images, thumbnails, words and hotspots', () => {
    const expected = [
      'living-room-1', 'bathroom-1', 'laundry-room-1', 'supermarket-2', 'cafe-1',
      'swimming-pool-1', 'skin-care-1', 'hotel-room-1', 'underwater-1',
    ];
    for (const id of expected) {
      const scene = publishedScenes.find(item => item.id === id);
      expect(scene, id).toBeDefined();
      expect(scene!.image).not.toBe(scene!.thumbnail);
      expect(scene!.thumbnail).toContain(`${id === 'supermarket-2' ? 'supermarket-1' : id === 'skin-care-1' ? 'skincare-1' : id === 'hotel-room-1' ? 'hotel-room-1' : id === 'underwater-1' ? 'underwater-world-1' : id}-thumb.webp`);
      expect(scene!.vocabularyIds).toHaveLength(10);
      expect(new Set(scene!.hotspots.map(hotspot => hotspot.vocabularyId))).toEqual(new Set(scene!.vocabularyIds));
    }
  });
  it('14. every displayed IPA has a valid slash form and a dictionary source', () => {
    publishedScenes.flatMap(scene => scene.vocabularyIds).forEach(id => {
      const item = vocabulary[id];
      expect(item.word.length).toBeGreaterThan(0);
      expect(item.chineseMeaning.length).toBeGreaterThan(0);
      expect(item.exampleSentence.length).toBeGreaterThan(10);
      if (item.britishIPA) {
        expect(item.britishIPA).toMatch(/^\/.+\/$/);
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
      // 1093/1152/1536 are the effective CSS widths for the requested desktop
      // viewports at 125% browser zoom; normalized geometry must be identical.
      for (const width of [320, 390, 768, 1093, 1152, 1280, 1536]) {
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
  it('binds the overlay to the visible contained image area and exposes debug mode through either router-safe query position', () => {
    expect(imageDisplayMetrics(1536, 1024, 1000, 800, 1440)).toMatchObject({
      renderedWidth: 1000,
      renderedHeight: expect.closeTo(666.6667),
      offsetLeft: 0,
      offsetTop: expect.closeTo(66.6667),
      viewportWidth: 1440,
    });
    expect(hotspotDebugEnabled({ search: '?hotspotDebug=1', hash: '#/scene/living-room-1' })).toBe(true);
    expect(hotspotDebugEnabled({ search: '', hash: '#/scene/living-room-1?hotspotDebug=1' })).toBe(true);
    expect(hotspotDebugEnabled({ search: '', hash: '#/scene/living-room-1' })).toBe(false);
    publishedScenes.forEach(scene => scene.hotspots.forEach(hotspot => expect(hotspotOutOfBounds(hotspot)).toBe(false)));
  });
});
