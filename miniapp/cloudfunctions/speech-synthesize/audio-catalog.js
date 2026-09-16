'use strict';

const fs = require('fs');
const path = require('path');
const catalog = require('./catalog.generated.json');

const pronunciationFiles = Object.freeze(Object.fromEntries(
  Object.keys(catalog.vocabulary).map(vocabularyId => [vocabularyId, `${vocabularyId}.wav`]),
));

function getBundledPronunciation(vocabularyId) {
  const fileName = pronunciationFiles[vocabularyId];
  if (!fileName) throw new Error('INVALID_WORD');
  const audio = fs.readFileSync(path.join(__dirname, 'audio', fileName));
  if (audio.length < 44 || audio.subarray(0, 4).toString('ascii') !== 'RIFF'
    || audio.subarray(8, 12).toString('ascii') !== 'WAVE') throw new Error('INVALID_AUDIO_ASSET');
  return { audio, fileName };
}

module.exports = { getBundledPronunciation, pronunciationFiles };
