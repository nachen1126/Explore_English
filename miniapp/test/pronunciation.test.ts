import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { kitchenScene } from '@shared';

const require = createRequire(import.meta.url);
const { getBundledPronunciation, pronunciationFiles } = require('../cloudfunctions/speech-synthesize/audio-catalog.js');
const { handlePronunciation } = require('../cloudfunctions/speech-synthesize/handler.js');

describe('bundled Kitchen pronunciation audio', () => {
  it('contains a valid WAV asset for every Kitchen vocabulary ID', () => {
    expect(Object.keys(pronunciationFiles).sort()).toEqual([...kitchenScene.vocabularyIds].sort());
    for (const vocabularyId of kitchenScene.vocabularyIds) {
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

  it('rejects IDs outside the fixed Kitchen allow-list', () => {
    expect(() => getBundledPronunciation('kitchen-not-real')).toThrow('INVALID_WORD');
  });

  it('returns playable audio data through the deployed handler contract', async () => {
    const response = await handlePronunciation({ vocabularyId: 'kitchen-fridge' });
    expect(response).toMatchObject({ ok: true, data: { format: 'wav' } });
    const decoded = Buffer.from(response.data.audioBase64, 'base64');
    expect(decoded.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(response.data.cacheKey).toContain('kitchen-standard-en-v1');
  });
});
