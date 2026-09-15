'use strict';
const crypto = require('crypto');

function safeUserId(openid) {
  if (!openid || typeof openid !== 'string') throw new Error('UNAUTHENTICATED');
  return crypto.createHash('sha256').update(`explore-english:${openid}`).digest('hex').slice(0, 32);
}
function ownedDocumentId(userId, recordId) { return `${userId}_${recordId}`; }

module.exports = { safeUserId, ownedDocumentId };
