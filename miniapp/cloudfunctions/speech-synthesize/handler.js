'use strict';

const { getBundledPronunciation } = require('./audio-catalog');

const ok = data => ({ ok: true, data });
const fail = (error, message) => ({ ok: false, error, message });

async function handlePronunciation(event = {}) {
  try {
    const { audio } = getBundledPronunciation(event.vocabularyId);
    return ok({
      audioBase64: audio.toString('base64'),
      format: 'wav',
      cacheKey: 'all-scenes-standard-en-v2',
    });
  } catch (error) {
    if (error.message === 'INVALID_WORD') return fail('INVALID_WORD', 'Unknown published vocabulary ID.');
    console.error('pronunciation asset failed', { vocabularyId: event.vocabularyId, error: error.message });
    return fail('AUDIO_ASSET_ERROR', 'The pronunciation audio could not be loaded.');
  }
}

module.exports = { handlePronunciation };
