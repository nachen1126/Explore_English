import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { miniappScenes, miniappVocabulary } from '../src/data/catalog';

const require = createRequire(import.meta.url);
const { getBundledPronunciation, pronunciationFiles } = require('../cloudfunctions/speech-synthesize/audio-catalog.js');
const { handlePronunciation } = require('../cloudfunctions/speech-synthesize/handler.js');

describe('bundled published-scene pronunciation audio', () => {
  it('contains a valid WAV asset for all 130 published vocabulary IDs', () => {
    const publishedIds = miniappScenes.flatMap(scene => scene.vocabularyIds);
    expect(publishedIds).toHaveLength(130);
    expect(Object.keys(pronunciationFiles).sort()).toEqual([...publishedIds].sort());
    for (const vocabularyId of publishedIds) {
      const { audio } = getBundledPronunciation(vocabularyId) as { audio: Buffer };
      expect(audio.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(audio.subarray(8, 12).toString('ascii')).toBe('WAVE');
      expect(audio.length).toBeGreaterThan(20_000);
      const dataOffset = audio.indexOf(Buffer.from('data'));
      expect(dataOffset).toBeGreaterThan(0);
      const samples = audio.subarray(dataOffset + 8);
      expect(samples.some(value => value !== 0)).toBe(true);
    }
  });

  it('rejects IDs outside the generated published-vocabulary allow-list', () => {
    expect(() => getBundledPronunciation('kitchen-not-real')).toThrow('INVALID_WORD');
  });

  it('returns playable audio data through the deployed handler contract', async () => {
    const response = await handlePronunciation({ vocabularyId: 'kitchen-fridge' });
    expect(response).toMatchObject({ ok: true, data: { format: 'wav' } });
    const decoded = Buffer.from(response.data.audioBase64, 'base64');
    expect(decoded.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(response.data.cacheKey).toContain('all-scenes-standard-en-v2');
  });

  it('covers the same IDs as the mini-program vocabulary catalog', () => {
    expect(new Set(Object.keys(pronunciationFiles))).toEqual(new Set(miniappVocabulary.map(item => item.id)));
  });
});
