'use strict';
const catalog = require('./catalog.generated.json');

const acceptedAnswers = Object.fromEntries(Object.values(catalog.vocabulary).map(item => [
  item.id, [item.word, ...(item.acceptedAnswers || [])],
]));

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
