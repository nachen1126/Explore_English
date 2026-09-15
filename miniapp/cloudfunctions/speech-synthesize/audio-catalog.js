'use strict';

const fs = require('fs');
const path = require('path');

const pronunciationFiles = Object.freeze({
  'kitchen-fridge': 'kitchen-fridge.wav',
  'kitchen-sink': 'kitchen-sink.wav',
  'kitchen-oven': 'kitchen-oven.wav',
  'kitchen-hob': 'kitchen-hob.wav',
  'kitchen-kettle': 'kitchen-kettle.wav',
  'kitchen-pan': 'kitchen-pan.wav',
  'kitchen-chopping-board': 'kitchen-chopping-board.wav',
  'kitchen-cupboard': 'kitchen-cupboard.wav',
  'kitchen-spatula': 'kitchen-spatula.wav',
  'kitchen-microwave': 'kitchen-microwave.wav',
});

function getBundledPronunciation(vocabularyId) {
  const fileName = pronunciationFiles[vocabularyId];
  if (!fileName) throw new Error('INVALID_WORD');
  const audio = fs.readFileSync(path.join(__dirname, 'audio', fileName));
  if (audio.length < 44 || audio.subarray(0, 4).toString('ascii') !== 'RIFF'
    || audio.subarray(8, 12).toString('ascii') !== 'WAVE') throw new Error('INVALID_AUDIO_ASSET');
  return { audio, fileName };
}

module.exports = { getBundledPronunciation, pronunciationFiles };
