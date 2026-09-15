'use strict';

const acceptedAnswers = {
  'kitchen-fridge': ['fridge', 'fridges', 'refrigerator', 'refrigerators'],
  'kitchen-sink': ['sink', 'sinks', 'kitchen sink'],
  'kitchen-oven': ['oven', 'ovens'],
  'kitchen-hob': ['hob', 'hobs', 'stovetop', 'stove top', 'cooktop'],
  'kitchen-kettle': ['kettle', 'kettles', 'electric kettle'],
  'kitchen-pan': ['pan', 'pans', 'frying pan', 'frying pans'],
  'kitchen-chopping-board': ['chopping board', 'chopping boards', 'cutting board', 'cutting boards'],
  'kitchen-cupboard': ['cupboard', 'cupboards', 'cabinet', 'cabinets', 'wall cupboard', 'kitchen cupboard'],
  'kitchen-spatula': ['spatula', 'spatulas', 'turner', 'fish slice'],
  'kitchen-microwave': ['microwave', 'microwaves', 'microwave oven'],
};

const normalizeAnswer = answer => answer.normalize('NFKC').toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[^\p{L}\p{N}\s']/gu, ' ')
  .replace(/'/g, '')
  .replace(/\s+/g, ' ').trim()
  .replace(/^(?:(?:it is|its|this is|that is) )?(?:(?:a|an|the) )?/, '');

function answerIsCorrect(answer, source, vocabularyId) {
  if (source === 'hotspot') return answer === vocabularyId;
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0
    && (acceptedAnswers[vocabularyId] || []).some(value => normalizeAnswer(value) === normalized);
}

module.exports = { answerIsCorrect, normalizeAnswer };
